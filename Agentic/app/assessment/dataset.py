"""Opt-in training rows using only evidence available before an assessment starts.

This module is an offline, server-side exporter. It never reads authentication
profiles, content snapshots, correct-option IDs, theory, or storage paths. A
caller supplies a separate secret salt and controls where the yielded rows go.
"""
from collections import Counter, defaultdict
import hashlib
import hmac
from itertools import groupby
from typing import Iterable

from sqlalchemy import select

from app.assessment import db


def training_records(conn, salt: str, include_development=False) -> Iterable[dict]:
    """Return pseudonymous, first-exposure independent-assessment examples.

    Prior topic counts include every finalized activity, including practice and
    known assistance. They advance only when that response AND its session
    submission occurred strictly before the target session started. Family
    exposure instead uses all earlier session membership snapshots, including
    unfinished sessions; this logs presentation, not confirmed student reading.
    Overlapping sessions cannot leak later grades or bypass exposure filtering.
    A target session containing a family more than once is ambiguous and omitted.

    Development records require an explicit opt-in; this option does not relax
    the independent-activity, assistance, or prior-family-exposure filters.
    Student pseudonyms are HMACs, not plain hashes. Keep the salt outside exported
    data and split evaluation data by student_key (and, when needed, time).
    """
    if not isinstance(salt, str) or len(salt) < 32 or not salt.strip():
        raise ValueError('A separate training-export salt of at least 32 characters is required')
    if not isinstance(include_development, bool):
        raise ValueError('include_development must be an explicit boolean')
    secret = salt.encode('utf-8')
    catalog = db.catalog.questions
    statement = select(
        db.sessions.c.student_id,
        db.students.c.is_development.label('student_development'),
        db.sessions.c.id.label('session_id'),
        db.sessions.c.started_at,
        db.sessions.c.submitted_at.label('session_submitted_at'),
        db.sessions.c.activity_type,
        db.sessions.c.is_development.label('session_development'),
        db.answers.c.question_id,
        db.answers.c.submitted_at.label('response_submitted_at'),
        db.answers.c.correct,
        db.answers.c.marks.label('awarded_marks'),
        db.answers.c.duration_ms,
        db.answers.c.hint_exposed,
        db.answers.c.solution_exposed,
        catalog.c.subject_id,
        catalog.c.topic_id,
        catalog.c.language_id,
        catalog.c.family_id,
        catalog.c.version,
        catalog.c.marks.label('possible_marks'),
        catalog.c.is_development.label('question_development'),
    ).select_from(
        db.answers.join(db.sessions, db.answers.c.session_id == db.sessions.c.id)
        .join(db.students, db.sessions.c.student_id == db.students.c.id)
        .join(catalog, db.answers.c.question_id == catalog.c.id)
    ).where(
        db.answers.c.is_final.is_(True),
        db.sessions.c.status == 'submitted',
        db.sessions.c.submitted_at.is_not(None),
        db.answers.c.submitted_at.is_not(None),
    ).order_by(
        db.sessions.c.student_id, db.sessions.c.started_at,
        db.sessions.c.id, db.answers.c.question_id,
    ).execution_options(stream_results=True, yield_per=1000)
    presentations = select(
        db.sessions.c.student_id,
        db.sessions.c.id.label('session_id'),
        db.sessions.c.started_at,
        catalog.c.family_id,
    ).select_from(
        db.presented.join(db.sessions, db.presented.c.session_id == db.sessions.c.id)
        .join(catalog, db.presented.c.question_id == catalog.c.id)
    ).order_by(
        db.sessions.c.student_id, db.sessions.c.started_at,
        db.sessions.c.id, db.presented.c.question_id,
    ).execution_options(stream_results=True, yield_per=1000)

    def records():
        # Two selected-column cursors, bounded by one student's history. No
        # per-question queries and no large JSON content is fetched. Both use
        # the database's student ordering, avoiding Python/SQL collation drift.
        with conn.execute(statement) as result, conn.execute(presentations) as presentation_result:
            presentation_groups = iter(groupby(presentation_result.mappings(), key=lambda row: row['student_id']))
            presentation_student, presentation_group = next(presentation_groups, (None, ()))
            for student_id, group in groupby(result.mappings(), key=lambda row: row['student_id']):
                rows = list(group)
                while presentation_student is not None and presentation_student != student_id:
                    presentation_student, presentation_group = next(presentation_groups, (None, ()))
                snapshots = list(presentation_group) if presentation_student == student_id else []
                ambiguous_sessions = {
                    session_id for (session_id, _family), count in
                    Counter((snapshot['session_id'], snapshot['family_id']) for snapshot in snapshots).items()
                    if count > 1
                }
                student_key = hmac.new(secret, student_id.encode('utf-8'), hashlib.sha256).hexdigest()
                events = sorted(rows, key=_available_at)
                topics = defaultdict(lambda: dict(attempts=0, correct=0, incorrect=0, unanswered=0, last_at=None))
                families = defaultdict(int)
                event_index = 0
                presentation_index = 0
                for row in rows:
                    cutoff = row['started_at']
                    while event_index < len(events) and _available_at(events[event_index]) < cutoff:
                        prior = events[event_index]
                        topic = topics[prior['topic_id']]
                        topic['attempts'] += 1
                        topic[_outcome(prior['correct'])] += 1
                        topic['last_at'] = _available_at(prior)
                        event_index += 1
                    while presentation_index < len(snapshots) and snapshots[presentation_index]['started_at'] < cutoff:
                        families[snapshots[presentation_index]['family_id']] += 1
                        presentation_index += 1
                    development = any(row[key] for key in ('student_development', 'session_development', 'question_development'))
                    if (row['activity_type'] != 'independent_assessment'
                            or row['session_id'] in ambiguous_sessions
                            or row['hint_exposed'] is True or row['solution_exposed'] is True
                            or families[row['family_id']] > 0
                            or (development and not include_development)):
                        continue
                    topic = topics[row['topic_id']]
                    yield {
                        'student_key': student_key,
                        'features': {
                            'subject_id': row['subject_id'],
                            'topic_id': row['topic_id'],
                            'language_id': row['language_id'],
                            'question_family_id': row['family_id'],
                            'question_version': row['version'],
                            'possible_marks': row['possible_marks'],
                            'prior_topic_attempts': topic['attempts'],
                            'prior_topic_correct': topic['correct'],
                            'prior_topic_incorrect': topic['incorrect'],
                            'prior_topic_unanswered': topic['unanswered'],
                            'prior_family_exposures': families[row['family_id']],
                            'seconds_since_prior_topic_response': None if topic['last_at'] is None else cutoff - topic['last_at'],
                        },
                        'labels': {
                            'correct': row['correct'],
                            'outcome': _outcome(row['correct']),
                            'awarded_marks': row['awarded_marks'],
                        },
                        'metadata': {
                            'session_id': row['session_id'],
                            'question_id': row['question_id'],
                            'started_at': cutoff,
                            'submitted_at': row['session_submitted_at'],
                            'response_submitted_at': row['response_submitted_at'],
                            'activity_type': row['activity_type'],
                            'is_development': development,
                            'hint_exposed': row['hint_exposed'],
                            'solution_exposed': row['solution_exposed'],
                            'response_duration_ms': row['duration_ms'],
                        },
                    }

    return records()


def _available_at(row):
    # Be conservative if legacy data records an answer time before the final
    # session submission. The finalized label was not available before both.
    return max(row['response_submitted_at'], row['session_submitted_at'])


def _outcome(correct):
    return 'correct' if correct is True else 'incorrect' if correct is False else 'unanswered'
