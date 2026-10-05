import time
import uuid
from typing import Literal
from fastapi import HTTPException
from pydantic import Field, model_validator
from sqlalchemy import select, and_
from app.config import settings
from app.assessment import db
from app.assessment.auth import Identity
from app.assessment.content import Strict

class Start(Strict):
    paper_id: str
    language: Literal['en', 'si', 'ta'] = 'en'

class Choice(Strict):
    question_id: str
    selected_option: str | None
    active_duration_ms: int | None = Field(default=None, ge=0, le=86_400_000)

class AnswerRequest(Strict):
    answers: list[Choice] = Field(max_length=200)
    @model_validator(mode='after')
    def unique(self):
        if len({a.question_id for a in self.answers}) != len(self.answers):
            raise ValueError('Duplicate question answers')
        return self

def owned(conn, session_id, identity, lock=False):
    query = select(db.sessions).where(db.sessions.c.id == session_id, db.sessions.c.student_id == identity.student_id)
    if lock: query = query.with_for_update()
    row = conn.execute(query).mappings().first()
    if not row: raise HTTPException(404, 'Assessment session not found')
    return row

def question_rows(conn, session_id):
    return list(conn.execute(select(db.questions.c.content).join(db.presented, db.presented.c.question_id == db.questions.c.id).where(db.presented.c.session_id == session_id).order_by(db.presented.c.position)).scalars())

def paper_list(conn, identity):
    return [{'id': p['id'], 'title': p['title'], 'version': p['version'], 'is_development': p['is_development'], 'question_count': len(p['question_ids'])} for p in conn.execute(select(db.papers.c.content)).scalars() if not p['is_development'] or (settings.ALLOW_DEVELOPMENT_CONTENT and identity.is_development)]

def start(engine, identity, request):
    with db.begin(engine) as conn:
        try:
            p = conn.execute(select(db.papers.c.content).where(db.papers.c.id == request.paper_id)).scalar_one_or_none()
            if not p or (p['is_development'] and not (settings.ALLOW_DEVELOPMENT_CONTENT and identity.is_development)):
                raise HTTPException(404, 'Published paper not found')
            # Lock the paper row to serialize first identity insertion on PostgreSQL.
            conn.execute(select(db.papers.c.id).where(db.papers.c.id == request.paper_id).with_for_update()).first()
            if not conn.execute(select(db.students.c.id).where(db.students.c.id == identity.student_id)).first():
                if conn.dialect.name == 'postgresql':
                    from sqlalchemy.dialects.postgresql import insert
                    conn.execute(insert(db.students).values(id=identity.student_id, is_development=identity.is_development).on_conflict_do_nothing())
                else:
                    conn.execute(db.students.insert().values(id=identity.student_id, is_development=identity.is_development))
            sid = str(uuid.uuid4())
            conn.execute(db.sessions.insert().values(id=sid, student_id=identity.student_id, paper_id=p['id'], status='in_progress', language=request.language, activity_type='independent_assessment', is_development=identity.is_development or p['is_development'], started_at=time.time()))
            conn.execute(db.presented.insert(), [{'session_id': sid, 'question_id': q, 'position': i} for i, q in enumerate(p['question_ids'])])
            conn.commit()
            return {'session_id': sid, 'status': 'in_progress'}
        except BaseException:
            conn.rollback()
            raise

def exam(conn, sid, identity):
    s = owned(conn, sid, identity)
    qs = question_rows(conn, sid)
    drafts = {a['question_id']: a['selected_option'] for a in conn.execute(select(db.answers).where(db.answers.c.session_id == sid)).mappings()}
    def display(q):
        return {'id': q['id'], 'version': q['version'], 'text': q['text'], 'marks': q['marks'], 'media_ids': q['media_ids'],
                'options': [{'id': o['id'], 'text': o['text'], 'media_ids': o['media_ids']} for o in q['options']]}
    return {'session_id': sid, 'status': s['status'], 'language': s['language'], 'questions': [display(q) for q in qs], 'drafts': drafts, 'is_development': s['is_development']}

def save_answers(engine, sid, identity, request, final=False):
    with db.begin(engine) as conn:
        try:
            s = owned(conn, sid, identity, lock=True)
            if s['status'] == 'submitted':
                if final:
                    result = submission(conn, sid, s)
                    conn.commit()
                    return result
                raise HTTPException(409, 'Assessment already submitted')
            qs = {q['id']: q for q in question_rows(conn, sid)}
            for a in request.answers:
                if a.question_id not in qs or (a.selected_option is not None and a.selected_option not in {o['id'] for o in qs[a.question_id]['options']}):
                    raise HTTPException(422, 'Question version or selected option does not belong to this assessment')
            now = time.time()
            # An explicit final body is authoritative; omitted questions are unanswered.
            choices = {a.question_id: a for a in request.answers}
            targets = qs if final else choices
            for qid in targets:
                a = choices.get(qid)
                selected = a.selected_option if a else None
                previous = conn.execute(select(db.answers).where(db.answers.c.session_id == sid, db.answers.c.question_id == qid)).mappings().first()
                values = dict(selected_option=selected, answered_at=now if selected else None,
                    submitted_at=now if final else None, duration_ms=a.active_duration_ms if a else None,
                    correct=(selected == qs[qid]['correct_option_id']) if selected is not None and final else None,
                    marks=qs[qid]['marks'] if final and selected == qs[qid]['correct_option_id'] else (0 if final else None),
                    is_final=final)
                if previous:
                    if previous['selected_option'] == selected:
                        values['answered_at'] = previous['answered_at']
                        if a and a.active_duration_ms is None: values['duration_ms'] = previous['duration_ms']
                    conn.execute(db.answers.update().where(db.answers.c.session_id == sid, db.answers.c.question_id == qid).values(**values))
                else:
                    # Exposure unavailable in the MVP: null, never invented false.
                    conn.execute(db.answers.insert().values(session_id=sid, question_id=qid, **values))
            if final:
                rows = list(conn.execute(select(db.answers).where(db.answers.c.session_id == sid)).mappings())
                counts = {'correct': sum(a['correct'] is True for a in rows), 'incorrect': sum(a['correct'] is False for a in rows), 'unanswered': sum(a['selected_option'] is None for a in rows)}
                total = sum(q['marks'] for q in qs.values())
                awarded = sum(a['marks'] for a in rows)
                score = {**counts, 'awarded_marks': awarded, 'total_marks': total, 'percentage': round(100 * awarded / total, 2)}
                conn.execute(db.sessions.update().where(db.sessions.c.id == sid).values(status='submitted', submitted_at=now, score=score))
                conn.execute(db.jobs.insert().values(id=str(uuid.uuid4()), session_id=sid, state='queued', attempts=0, available_at=now))
                result = submission(conn, sid, {'score': score})
            else:
                result = {'session_id': sid, 'status': 'draft_saved'}
            conn.commit()
            return result
        except BaseException:
            conn.rollback()
            raise

def submission(conn, sid, session):
    job = conn.execute(select(db.jobs).where(db.jobs.c.session_id == sid)).mappings().one()
    return {'session_id': sid, 'score': session['score'], 'analysis_status': job['state'], 'job_id': job['id']}

def success_rate(conn, qid, activity_type='independent_assessment'):
    # First finalized presentation per student/version, including unanswered.
    rows = conn.execute(select(db.sessions.c.student_id, db.answers.c.correct, db.answers.c.selected_option)
        .join(db.answers, db.answers.c.session_id == db.sessions.c.id)
        .where(db.answers.c.question_id == qid, db.answers.c.is_final.is_(True), db.sessions.c.is_development.is_(False), db.sessions.c.activity_type == activity_type,
               db.answers.c.hint_exposed.is_not(True), db.answers.c.solution_exposed.is_not(True))
        .order_by(db.sessions.c.submitted_at, db.sessions.c.id)).mappings()
    first = {}
    for r in rows:
        first.setdefault(r['student_id'], r)
    n = len(first)
    numerator = sum(r['correct'] is True for r in first.values())
    return {'population': 'First finalized independent assessments per student and question version; development data excluded; unanswered included in denominator.',
            'activity_type': activity_type, 'numerator': numerator, 'denominator': n, 'percentage': round(100 * numerator / n, 2) if n else None,
            'sample_label': 'no_data' if not n else ('small_sample' if n < 30 else 'available')}

def results(conn, sid, identity):
    s = owned(conn, sid, identity)
    if s['status'] != 'submitted': raise HTTPException(409, 'Submit the assessment before viewing results')
    qs = question_rows(conn, sid)
    answer_map = {a['question_id']: dict(a) for a in conn.execute(select(db.answers).where(db.answers.c.session_id == sid)).mappings()}
    feedback = {a['question_id']: a['content'] for a in conn.execute(select(db.analyses).where(db.analyses.c.session_id == sid).order_by(db.analyses.c.analysis_version)).mappings()}
    breakdown, reviews = {}, []
    for q in qs:
        a = answer_map[q['id']]
        status = 'unanswered' if a['selected_option'] is None else ('correct' if a['correct'] else 'incorrect')
        cid = q['concept_id']
        if cid not in breakdown:
            c = conn.execute(select(db.concepts).where(db.concepts.c.id == cid)).mappings().one()
            u = conn.execute(select(db.units).where(db.units.c.id == c['unit_id'])).mappings().one()
            breakdown[cid] = {'concept_id': cid, 'concept_name': c['name'], 'unit_id': u['id'], 'unit_name': u['name'], 'correct': 0, 'incorrect': 0, 'unanswered': 0, 'awarded_marks': 0, 'total_marks': 0, 'evidence_question_ids': []}
        b = breakdown[cid]
        b[status] += 1
        b['awarded_marks'] += a['marks']
        b['total_marks'] += q['marks']
        b['evidence_question_ids'].append(q['id'])
        reviews.append({'question': q, 'answer': a, 'success_rate': success_rate(conn, q['id']), 'analysis': feedback.get(q['id']),
                        'base_explanation': q['base_explanation'], 'resources': [conn.execute(select(db.resources.c.content).where(db.resources.c.id == rid)).scalar_one() for rid in q['resource_ids']]})
    for b in breakdown.values():
        b['percentage'] = round(100 * b['awarded_marks'] / b['total_marks'], 2)
        b['recommendation'] = ('Revise using these incorrect responses as limited evidence.' if b['incorrect'] else ('Attempt the unanswered questions; no misconception is inferred.' if b['unanswered'] else 'Correct on the questions in this assessment; continue reviewing.'))
    units = {}
    for b in breakdown.values():
        u = units.setdefault(b['unit_id'], {'unit_id': b['unit_id'], 'unit_name': b['unit_name'], 'correct': 0, 'incorrect': 0, 'unanswered': 0, 'awarded_marks': 0, 'total_marks': 0})
        for key in ('correct', 'incorrect', 'unanswered', 'awarded_marks', 'total_marks'): u[key] += b[key]
    for u in units.values(): u['percentage'] = round(100 * u['awarded_marks'] / u['total_marks'], 2)
    return {**submission(conn, sid, s), 'is_development': s['is_development'], 'concepts': list(breakdown.values()), 'units': list(units.values()),
            'revision_concept_ids': [b['concept_id'] for b in breakdown.values() if b['incorrect'] or b['unanswered']], 'questions': reviews,
            'interpretation': 'Performance in this assessment only; this does not establish long-term mastery.'}

def allowed_media(conn, sid, mid, identity):
    s = owned(conn, sid, identity)
    allowed = set()
    for q in question_rows(conn, sid):
        allowed.update(q['media_ids'])
        for o in q['options']: allowed.update(o['media_ids'])
        if s['status'] == 'submitted': allowed.update(q['solution_media_ids'])
    if mid not in allowed: raise HTTPException(404, 'Media not available in this assessment')
    return conn.execute(select(db.media.c.content).where(db.media.c.id == mid)).scalar_one()
