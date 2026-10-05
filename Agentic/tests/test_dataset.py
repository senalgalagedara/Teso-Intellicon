"""Synthetic, temporary-database checks for the offline training exporter."""
import copy
import hashlib
import hmac
import json

import pytest
from sqlalchemy import event, select

from app.assessment import db
from app.assessment.content import Package, import_package
from app.assessment.dataset import training_records
from conftest import NoMedia


SALT = 'training-test-salt-never-part-of-export-123456789'
STUDENT = 'private-student@example.invalid'
FIRST = 'force-training-en-v1'
TRANSLATION = 'force-training-si-v1'
VERSION_TWO = 'force-training-en-v2'
OTHER = 'force-other-en-v1'
THIRD = 'force-third-en-v1'
FOURTH = 'force-fourth-en-v1'


@pytest.fixture
def bank(engine, package):
    for qid, family, language, version in [
        (FIRST, 'force-training-family', 'en', 1),
        (TRANSLATION, 'force-training-family', 'si', 1),
        (VERSION_TWO, 'force-training-family', 'en', 2),
        (OTHER, 'force-other-family', 'en', 1),
        (THIRD, 'force-third-family', 'en', 1),
        (FOURTH, 'force-fourth-family', 'en', 1),
    ]:
        content = copy.deepcopy(package.model_dump())
        question = content['questions'][0]
        theory = content['resources'][0]
        theory.update(id=f'private-training-theory-{language}', language=language,
                      theory='PRIVATE THEORY TEXT SHOULD NEVER BE EXPORTED')
        question.update(id=qid, family_id=family, language=language, version=version,
                        text='PRIVATE QUESTION TEXT SHOULD NEVER BE EXPORTED',
                        base_explanation='PRIVATE SOLUTION SHOULD NEVER BE EXPORTED',
                        resource_ids=[theory['id']])
        content['questions'] = [question]
        content['resources'] = [theory]
        content['paper'].update(id=f'training-{qid}', question_ids=[qid], content_language=language)
        import_package(engine, Package.model_validate(content), NoMedia())
    # These production-shaped flags are synthetic test data, never a content
    # promotion or import into an actual deployment.
    with engine.begin() as conn:
        conn.execute(db.catalog.questions.update().values(is_development=False))
    return engine


def response(engine, sid, qid, started, submitted, *, student=STUDENT,
             correct=True, activity='independent_assessment', hint=None,
             solution=None, development=False, student_development=False,
             duration=1200, final=True, status='submitted', answer_submitted=None):
    with engine.begin() as conn:
        if not conn.execute(select(db.students.c.id).where(db.students.c.id == student)).first():
            conn.execute(db.students.insert().values(id=student, is_development=student_development))
        conn.execute(db.sessions.insert().values(
            id=sid, student_id=student, paper_id='physics-development-v1',
            status=status, language='si' if qid == TRANSLATION else 'en',
            activity_type=activity, is_development=development,
            started_at=started, submitted_at=submitted,
        ))
        conn.execute(db.presented.insert().values(session_id=sid, question_id=qid, position=0))
        conn.execute(db.answers.insert().values(
            session_id=sid, question_id=qid,
            selected_option='a' if correct is True else 'b' if correct is False else None,
            answered_at=submitted, submitted_at=submitted if answer_submitted is None else answer_submitted,
            duration_ms=duration, hint_exposed=hint, solution_exposed=solution,
            correct=correct, marks=2 if correct is True else 0, is_final=final,
        ))


def exported(engine, **kwargs):
    with engine.connect() as conn:
        return list(training_records(conn, SALT, **kwargs))


@pytest.mark.parametrize('salt', ['', 'x' * 31, ' ' * 32, None, b'x' * 40])
def test_export_requires_separate_secret_salt(bank, salt):
    with bank.connect() as conn, pytest.raises(ValueError, match='salt'):
        training_records(conn, salt)


def test_pseudonym_stability_salt_separation_and_no_sensitive_fields(bank):
    response(bank, 'session-first', FIRST, 10, 20, duration=9876)
    rows = exported(bank)
    assert len(rows) == 1
    row = rows[0]
    assert row['student_key'] == hmac.new(SALT.encode(), STUDENT.encode(), hashlib.sha256).hexdigest()
    assert exported(bank)[0]['student_key'] == row['student_key']
    with bank.connect() as conn:
        other = list(training_records(conn, 'another-independent-test-secret-salt-123456789'))
        with pytest.raises(ValueError, match='boolean'):
            training_records(conn, SALT, include_development='false')
    assert other[0]['student_key'] != row['student_key']
    encoded = json.dumps(row, allow_nan=False)
    for value in (STUDENT, SALT, 'PRIVATE', 'correct_answer', 'correct_option',
                  'selected_option', 'theory_text', 'base_explanation',
                  'object_key', 'bucket_id', 'question_text', 'answer_text'):
        assert value not in encoded
    assert row['metadata']['response_duration_ms'] == 9876
    assert not any('duration' in key or 'correct_answer' in key for key in row['features'])
    assert row['features']['prior_topic_attempts'] == 0
    assert row['features']['seconds_since_prior_topic_response'] is None


def test_prior_features_include_practice_but_never_later_or_overlapping_results(bank):
    # Insert in a different order from either start or submission chronology.
    response(bank, 'future', FOURTH, 40, 60, correct=True)
    response(bank, 'overlapping', THIRD, 25, 45, correct=True)
    response(bank, 'target', OTHER, 30, 50, correct=False)
    response(bank, 'practice', FIRST, 5, 10, correct=True, activity='adaptive_practice')
    response(bank, 'hinted', TRANSLATION, 11, 20, correct=False, hint=True)
    response(bank, 'unanswered', VERSION_TWO, 21, 25, correct=None, activity='assisted_practice')
    response(bank, 'other-student', 'force-dev-v1', 1, 2, student='another-private-student', correct=False)
    rows = {row['metadata']['session_id']: row for row in exported(bank)}
    assert 'practice' not in rows and 'hinted' not in rows and 'unanswered' not in rows
    target = rows['target']['features']
    assert (target['prior_topic_attempts'], target['prior_topic_correct'],
            target['prior_topic_incorrect'], target['prior_topic_unanswered']) == (3, 1, 1, 1)
    assert target['seconds_since_prior_topic_response'] == 5
    # Starting earlier is insufficient: this response was finalized at 45,
    # after the target started at 30, and is absent from its predictive counts.
    assert rows['overlapping']['features']['prior_topic_attempts'] == 2
    assert rows['future']['features']['prior_topic_attempts'] == 3
    assert rows['target']['labels'] == dict(correct=False, outcome='incorrect', awarded_marks=0)


def test_response_at_exact_start_and_early_legacy_answer_timestamp_do_not_leak(bank):
    response(bank, 'same-time', FIRST, 1, 20, activity='assisted_practice')
    response(bank, 'early-answer', TRANSLATION, 5, 25, answer_submitted=10, activity='assisted_practice')
    response(bank, 'target', OTHER, 20, 40)
    row = exported(bank)[0]
    assert row['metadata']['session_id'] == 'target'
    assert row['features']['prior_topic_attempts'] == 0


def test_prior_family_exposure_excludes_translation_and_new_version(bank):
    response(bank, 'practice', FIRST, 1, 5, activity='adaptive_practice')
    response(bank, 'translation', TRANSLATION, 10, 20)
    response(bank, 'version-two', VERSION_TWO, 30, 40)
    response(bank, 'new-family', OTHER, 50, 60)
    rows = exported(bank)
    assert [row['metadata']['session_id'] for row in rows] == ['new-family']
    assert rows[0]['features']['prior_topic_attempts'] == 3
    assert rows[0]['features']['prior_family_exposures'] == 0


def test_unanswered_is_a_distinct_nullable_label_not_incorrect(bank):
    response(bank, 'unanswered-first', FIRST, 1, 5, correct=None)
    response(bank, 'later-topic', OTHER, 10, 20)
    rows = exported(bank)
    assert rows[0]['labels'] == dict(correct=None, outcome='unanswered', awarded_marks=0)
    assert rows[1]['features']['prior_topic_unanswered'] == 1
    assert rows[1]['features']['prior_topic_incorrect'] == 0


@pytest.mark.parametrize('source', ['session', 'question', 'student'])
def test_development_requires_opt_in_for_each_source(bank, source):
    response(bank, 'dev-first', FIRST, 1, 5,
             development=source == 'session', student_development=source == 'student')
    if source == 'question':
        with bank.begin() as conn:
            conn.execute(db.catalog.questions.update().where(db.catalog.questions.c.id == FIRST).values(is_development=True))
    assert exported(bank) == []
    rows = exported(bank, include_development=True)
    assert len(rows) == 1 and rows[0]['metadata']['is_development'] is True


@pytest.mark.parametrize('assistance', ['hint', 'solution'])
def test_known_assistance_excluded_even_with_development_opt_in(bank, assistance):
    response(bank, 'assisted', FIRST, 1, 5, development=True,
             hint=assistance == 'hint', solution=assistance == 'solution')
    assert exported(bank, include_development=True) == []


def test_incomplete_and_draft_rows_add_exposure_without_label_history(bank):
    response(bank, 'draft', FIRST, 1, 5, final=False, status='started')
    response(bank, 'not-submitted', TRANSLATION, 1, 6, final=True, status='started')
    response(bank, 'repeated-family', VERSION_TWO, 10, 20)
    response(bank, 'target', OTHER, 10, 20)
    rows = exported(bank)
    assert [row['metadata']['session_id'] for row in rows] == ['target']
    assert rows[0]['features']['prior_topic_attempts'] == 0


def test_unfinished_membership_without_any_answer_excludes_later_translation(bank):
    response(bank, 'unfinished', FIRST, 1, None, final=False, status='started')
    with bank.begin() as conn:
        conn.execute(db.answers.delete().where(db.answers.c.session_id == 'unfinished'))
    response(bank, 'translation', TRANSLATION, 10, 20)
    assert exported(bank) == []


def test_prior_overlapping_family_presentation_excludes_target_before_result_known(bank):
    response(bank, 'earlier-start', FIRST, 1, 30, correct=False)
    response(bank, 'repeat-overlapping', TRANSLATION, 10, 20, correct=True)
    response(bank, 'unseen-family', OTHER, 10, 20, correct=True)
    rows = {row['metadata']['session_id']: row for row in exported(bank)}
    assert set(rows) == {'earlier-start', 'unseen-family'}
    assert rows['unseen-family']['features']['prior_topic_attempts'] == 0
    assert rows['unseen-family']['features']['seconds_since_prior_topic_response'] is None


def test_future_family_presentation_does_not_disqualify_earlier_target(bank):
    response(bank, 'future-presentation', TRANSLATION, 20, 30)
    response(bank, 'first-presentation', FIRST, 10, 40)
    rows = exported(bank)
    assert [row['metadata']['session_id'] for row in rows] == ['first-presentation']
    assert rows[0]['features']['prior_family_exposures'] == 0


def test_session_with_duplicate_family_is_entirely_excluded(bank):
    response(bank, 'ambiguous', FIRST, 1, 10)
    with bank.begin() as conn:
        for position, qid in enumerate([TRANSLATION, OTHER], 1):
            conn.execute(db.presented.insert().values(session_id='ambiguous', question_id=qid, position=position))
            conn.execute(db.answers.insert().values(
                session_id='ambiguous', question_id=qid, selected_option='a',
                answered_at=10, submitted_at=10, correct=True, marks=2, is_final=True,
            ))
    response(bank, 'later-unseen', THIRD, 20, 30)
    rows = exported(bank)
    assert [row['metadata']['session_id'] for row in rows] == ['later-unseen']
    # Omitted training samples still contribute eligible prior outcome history.
    assert rows[0]['features']['prior_topic_attempts'] == 3


def test_export_uses_two_batched_selected_column_queries_for_all_students(bank):
    response(bank, 'presentation-only-before', FIRST, 1, None,
             student='aaaa-presentation-only', final=False, status='started')
    response(bank, 'presentation-only-after', FIRST, 1, None,
             student='zzzz-presentation-only', final=False, status='started')
    for number in range(15):
        response(bank, f'query-test-{number}', FIRST, 1, 5, student=f'private-student-{number}')
    statements = []
    def capture(_conn, _cursor, statement, _parameters, _context, _executemany):
        statements.append(statement)
    event.listen(bank, 'before_cursor_execute', capture)
    try:
        assert len(exported(bank)) == 15
    finally:
        event.remove(bank, 'before_cursor_execute', capture)
    assert len(statements) <= 2
    assert all('.content' not in statement for statement in statements)
