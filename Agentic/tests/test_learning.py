import json
import asyncio
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi import HTTPException
from sqlalchemy import select, func
from app.assessment import db, service, learning
from app.assessment.content import Package, import_package
from app.assessment.auth import Identity
from app.assessment.cli import migrate
from app.assessment.api_schemas import Plan, History, Exam
from app.assessment.worker import process_one
from app.assessment.provider import MockProvider
from conftest import NoMedia

def bank(engine, language='en'):
    package = Package.model_validate_json((Path(__file__).parents[1] / f'fixtures/physics-transfer-{language}-development.json').read_text(encoding='utf-8'))
    import_package(engine, package, NoMedia())
    return package

def complete(engine, student, sid=None, correct=False):
    sid = sid or service.start(engine, student, service.Start(paper_id='physics-development-v1'))['session_id']
    with engine.connect() as conn: questions = service.question_rows(conn, sid)
    answers = [service.Choice(question_id=q['id'], selected_option=q['correct_option_id'] if correct else ('a' if q['id'] == 'force-dev-v1' else None)) for q in questions]
    service.save_answers(engine, sid, student, service.AnswerRequest(answers=answers), final=True)
    return sid

def test_plan_balances_weak_theory_retention_and_unseen_versions(engine, student):
    bank(engine)
    sid = complete(engine, student)
    with engine.connect() as conn:
        plan = learning.recommend(conn, sid, student, 5)
        Plan.model_validate(plan)
        assert len(plan['question_ids']) == len(set(plan['question_ids'])) == 5
        assert plan['repeated_question_ids'] == []
        assert set(plan['target_concept_ids']) == {'speed-dev', 'wave-speed-dev'}
        assert {'speed-dev', 'wave-speed-dev', 'force-dev'} <= {s['concept_id'] for s in plan['selections']}
        assert sum(s['reason'] == 'revise_missed_theory' for s in plan['selections']) >= 3
        assert 'correct_option_id' not in json.dumps(plan)

def test_follow_up_persisted_history_improvement_and_ownership(engine, student):
    bank(engine)
    sid = complete(engine, student)
    next_id = learning.start_next(engine, sid, student, 5)['session_id']
    with engine.connect() as conn:
        exam = service.exam(conn, next_id, student)
        Exam.model_validate(exam)
        assert exam['plan']['source_session_id'] == sid
        assert len(exam['questions']) == 5
    complete(engine, student, next_id, True)
    with engine.connect() as conn:
        h = learning.history(conn, student)
        History.model_validate(h)
        assert h['completed_count'] == 2
        assert h['attempts'][0]['activity_type'] == 'adaptive_practice'
        assert h['attempts'][0]['repeated_question_ids'] == []
        assert all(c['latest_percentage'] == 100 for c in h['concepts'])
        assert next(c for c in h['concepts'] if c['concept_id'] == 'speed-dev')['change_from_previous'] == 100
        assert learning.history(conn, Identity(student_id='dev-other', is_development=True))['completed_count'] == 0
        with pytest.raises(HTTPException): learning.recommend(conn, sid, Identity(student_id='dev-other', is_development=True))
    reopened = db.make_engine(str(engine.url))
    with reopened.connect() as conn: assert learning.history(conn, student)['completed_count'] == 2
    reopened.dispose()

def test_limited_bank_reports_repeats_and_unanswered_is_not_misconception(engine, student):
    sid = complete(engine, student)
    with engine.connect() as conn:
        p = learning.recommend(conn, sid, student)
        assert p['question_count'] == 3
        assert len(p['repeated_question_ids']) == 3
        assert len(p['warnings']) == 2
        r = learning.history(conn, student)['attempts'][0]
        assert next(c for c in r['concepts'] if c['concept_id'] == 'speed-dev')['unanswered'] == 1

def test_concurrent_next_creation_is_idempotent_and_snapshot_stable(engine, student):
    bank(engine)
    sid = complete(engine, student)
    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(lambda _: learning.start_next(engine, sid, student, 5)['session_id'], range(2)))
    assert len(set(ids)) == 1
    with engine.connect() as conn:
        original = learning.recommend(conn, sid, student, 5)
        assert conn.execute(select(func.count()).select_from(db.plans)).scalar() == 1
    bank(engine, 'ta')
    with engine.connect() as conn: assert learning.recommend(conn, sid, student, 10) == original

@pytest.mark.parametrize('language', ['si', 'ta'])
def test_selection_never_mixes_content_languages(engine, student, language):
    pkg = bank(engine, language)
    bank(engine, 'en')
    sid = service.start(engine, student, service.Start(paper_id=pkg.paper.id, language=language))['session_id']
    complete(engine, student, sid, True)
    with engine.connect() as conn:
        p = learning.recommend(conn, sid, student)
        assert set(p['question_ids']) <= set(pkg.paper.question_ids)
        assert len(p['repeated_question_ids']) == 9
        assert any(row['content_language'] == language for row in service.paper_list(conn, student))

def test_no_history_from_drafts_or_unsubmitted_follow_up(engine, student):
    sid = service.start(engine, student, service.Start(paper_id='physics-development-v1'))['session_id']
    service.save_answers(engine, sid, student, service.AnswerRequest(answers=[]))
    with engine.connect() as conn:
        assert learning.history(conn, student)['completed_count'] == 0
        with pytest.raises(HTTPException) as exc: learning.recommend(conn, sid, student)
        assert exc.value.status_code == 409

def test_migration_backfills_legacy_submissions_and_is_repeatable(engine, student):
    sid = complete(engine, student)
    with engine.begin() as conn: conn.execute(db.learning_records.delete())
    db.plans.drop(engine)
    db.learning_records.drop(engine)
    migrate(engine); migrate(engine)
    with engine.connect() as conn:
        assert learning.history(conn, student)['attempts'][0]['session_id'] == sid
        assert conn.execute(select(db.schema_versions.c.version).order_by(db.schema_versions.c.version)).scalars().all() == [1, 2, 3]

def test_population_excludes_later_independent_response_after_practice(engine, student):
    sid = complete(engine, student)
    follow = learning.start_next(engine, sid, student, 3)['session_id']
    complete(engine, student, follow, True)
    later = complete(engine, student, correct=True)
    with engine.begin() as conn:
        conn.execute(db.sessions.update().where(db.sessions.c.id == sid).values(is_development=False, activity_type='adaptive_practice'))
        conn.execute(db.sessions.update().where(db.sessions.c.id.in_([follow, later])).values(is_development=False))
    with engine.connect() as conn: assert service.success_rate(conn, 'force-dev-v1')['denominator'] == 0

def test_import_legacy_package_after_metadata_defaults_remains_immutable(engine, package):
    import_package(engine, package, NoMedia())
    with engine.begin() as conn:
        content = conn.execute(select(db.papers.c.content)).scalar_one()
        content.pop('subject_id'); content.pop('content_language')
        conn.execute(db.papers.update().values(content=content))
    import_package(engine, package, NoMedia())

def test_targeted_demo_worker_does_not_claim_another_students_job(engine, student):
    other = Identity(student_id='dev-other-worker', is_development=True)
    untouched = complete(engine, other)
    target = complete(engine, student)
    assert asyncio.run(process_one(engine, MockProvider(), session_id=target))
    with engine.connect() as conn:
        states = dict(conn.execute(select(db.jobs.c.session_id, db.jobs.c.state)).all())
        assert states[untouched] == 'queued'
        assert states[target] == 'completed'
