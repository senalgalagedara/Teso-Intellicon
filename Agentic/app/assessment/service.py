import time
import uuid
from typing import Literal
from fastapi import HTTPException
from pydantic import Field, model_validator
from sqlalchemy import select, func, case
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
    allow_dev = settings.ALLOW_DEVELOPMENT_CONTENT and (identity.is_development or settings.ENVIRONMENT == 'development')
    papers = [p for p in conn.execute(select(db.papers.c.content)).scalars() if not p['is_development'] or allow_dev]
    subjects = {r['question_id']: r for r in conn.execute(select(db.questions.c.id.label('question_id'), db.subjects.c.id.label('subject_id'), db.subjects.c.name).select_from(db.questions).join(db.concepts).join(db.units).join(db.subjects).where(db.questions.c.id.in_([p['question_ids'][0] for p in papers]))).mappings()}
    return [dict(id=p['id'], title=p['title'], version=p['version'], is_development=p['is_development'], question_count=len(p['question_ids']), subject_id=subjects[p['question_ids'][0]]['subject_id'], subject_name=subjects[p['question_ids'][0]]['name'], content_language=p.get('content_language', 'en')) for p in papers]

def start(engine, identity, request, *, plan=None):
    with db.begin(engine) as conn:
        try:
            allow_dev = settings.ALLOW_DEVELOPMENT_CONTENT and (identity.is_development or settings.ENVIRONMENT == 'development')
            p = conn.execute(select(db.papers.c.content).where(db.papers.c.id == request.paper_id)).scalar_one_or_none()
            if not p or (p['is_development'] and not allow_dev):
                raise HTTPException(404, 'Published paper not found')
            if plan:
                owned(conn, plan['source_session_id'], identity, lock=True)
                previous = conn.execute(select(db.plans.c.session_id).where(db.plans.c.source_session_id == plan['source_session_id'])).scalar_one_or_none()
                if previous:
                    status = owned(conn, previous, identity)['status']
                    conn.commit()
                    return {'session_id': previous, 'status': status}
            # Lock the paper row to serialize first identity insertion on PostgreSQL.
            conn.execute(select(db.papers.c.id).where(db.papers.c.id == request.paper_id).with_for_update()).first()
            if not conn.execute(select(db.students.c.id).where(db.students.c.id == identity.student_id)).first():
                if conn.dialect.name == 'postgresql':
                    from sqlalchemy.dialects.postgresql import insert
                    conn.execute(insert(db.students).values(id=identity.student_id, is_development=identity.is_development).on_conflict_do_nothing())
                else:
                    conn.execute(db.students.insert().values(id=identity.student_id, is_development=identity.is_development))
            sid = str(uuid.uuid4())
            conn.execute(db.sessions.insert().values(id=sid, student_id=identity.student_id, paper_id=p['id'], status='in_progress', language=request.language, activity_type='adaptive_practice' if plan else 'independent_assessment', is_development=identity.is_development or p['is_development'], started_at=time.time()))
            conn.execute(db.presented.insert(), [{'session_id': sid, 'question_id': q, 'position': i} for i, q in enumerate(plan['question_ids'] if plan else p['question_ids'])])
            if plan: conn.execute(db.plans.insert().values(session_id=sid, source_session_id=plan['source_session_id'], content=plan))
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
    plan = conn.execute(select(db.plans.c.content).where(db.plans.c.session_id == sid)).scalar_one_or_none()
    return {'plan': plan, 'session_id': sid, 'status': s['status'], 'language': s['language'], 'questions': [display(q) for q in qs], 'drafts': drafts, 'is_development': s['is_development']}

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
                from app.assessment.learning import save_record
                save_record(conn, sid)
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

def success_rates(conn, qids, activity_type='independent_assessment'):
    first = select(db.answers.c.question_id, db.answers.c.correct, db.sessions.c.activity_type, db.answers.c.hint_exposed, db.answers.c.solution_exposed,
        func.row_number().over(partition_by=[db.sessions.c.student_id, db.answers.c.question_id], order_by=[db.sessions.c.submitted_at, db.sessions.c.id]).label('position')).join(db.sessions, db.sessions.c.id == db.answers.c.session_id).where(db.answers.c.question_id.in_(qids), db.answers.c.is_final.is_(True), db.sessions.c.is_development.is_(False)).subquery()
    rates = {r['question_id']: r for r in conn.execute(select(first.c.question_id, func.count().label('denominator'), func.sum(case((first.c.correct.is_(True), 1), else_=0)).label('numerator')).where(first.c.position == 1, first.c.activity_type == activity_type, first.c.hint_exposed.is_not(True), first.c.solution_exposed.is_not(True)).group_by(first.c.question_id)).mappings()}
    output = {}
    for qid in qids:
        row = rates.get(qid, {})
        n, numerator = row.get('denominator', 0), row.get('numerator', 0)
        output[qid] = dict(population='First finalized response per student and question version, eligible only if independent and without known hint or solution exposure; prior practice and development data excluded; unanswered included in denominator.', activity_type=activity_type, numerator=numerator, denominator=n, percentage=round(100*numerator/n, 2) if n else None, sample_label='no_data' if not n else 'small_sample' if n < 30 else 'available')
    return output

def success_rate(conn, qid, activity_type='independent_assessment'):
    return success_rates(conn, [qid], activity_type)[qid]

def results(conn, sid, identity):
    s = owned(conn, sid, identity)
    if s['status'] != 'submitted': raise HTTPException(409, 'Submit the assessment before viewing results')
    qs = question_rows(conn, sid)
    answer_map = {a['question_id']: dict(a) for a in conn.execute(select(db.answers).where(db.answers.c.session_id == sid)).mappings()}
    feedback = {a['question_id']: a['content'] for a in conn.execute(select(db.analyses).where(db.analyses.c.session_id == sid).order_by(db.analyses.c.analysis_version)).mappings()}
    concept_map = {c['id']: c for c in conn.execute(select(db.concepts).where(db.concepts.c.id.in_({q['concept_id'] for q in qs}))).mappings()}
    unit_map = {u['id']: u for u in conn.execute(select(db.units).where(db.units.c.id.in_({c['unit_id'] for c in concept_map.values()}))).mappings()}
    resource_map = {r['id']: r['content'] for r in conn.execute(select(db.resources).where(db.resources.c.id.in_({rid for q in qs for rid in q['resource_ids']}))).mappings()}
    rates = success_rates(conn, [q['id'] for q in qs])
    breakdown, reviews = {}, []
    for q in qs:
        a = answer_map[q['id']]
        status = 'unanswered' if a['selected_option'] is None else ('correct' if a['correct'] else 'incorrect')
        cid = q['concept_id']
        if cid not in breakdown:
            c = concept_map[cid]
            u = unit_map[c['unit_id']]
            breakdown[cid] = {'concept_id': cid, 'concept_name': c['name'], 'unit_id': u['id'], 'unit_name': u['name'], 'correct': 0, 'incorrect': 0, 'unanswered': 0, 'awarded_marks': 0, 'total_marks': 0, 'evidence_question_ids': []}
        b = breakdown[cid]
        b[status] += 1
        b['awarded_marks'] += a['marks']
        b['total_marks'] += q['marks']
        b['evidence_question_ids'].append(q['id'])
        reviews.append({'question': q, 'answer': a, 'success_rate': rates[q['id']], 'analysis': feedback.get(q['id']),
                        'base_explanation': q['base_explanation'], 'resources': [resource_map[rid] for rid in q['resource_ids']]})
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
        if s['status'] == 'submitted':
            allowed.update(q['solution_media_ids'])
            for r in conn.execute(select(db.resources.c.content).where(db.resources.c.id.in_(q['resource_ids']))).scalars(): allowed.update(r.get('media_ids', []))
    if mid not in allowed: raise HTTPException(404, 'Media not available in this assessment')
    return conn.execute(select(db.media.c.content).where(db.media.c.id == mid)).scalar_one()

def check_single_answer(engine, sid, identity, question_id: str, selected_option: str, active_duration_ms: int | None = None):
    with db.begin(engine) as conn:
        try:
            s = owned(conn, sid, identity, lock=True)
            if s['status'] == 'submitted':
                raise HTTPException(409, 'Assessment already submitted')
            qs = {q['id']: q for q in question_rows(conn, sid)}
            if question_id not in qs:
                raise HTTPException(404, 'Question does not belong to this assessment')
            q = qs[question_id]
            valid_options = {o['id'] for o in q['options']}
            if selected_option not in valid_options:
                raise HTTPException(422, 'Selected option does not belong to this question')
            
            is_correct = (selected_option == q['correct_option_id'])
            now = time.time()
            
            previous = conn.execute(select(db.answers).where(db.answers.c.session_id == sid, db.answers.c.question_id == question_id)).mappings().first()
            values = dict(
                selected_option=selected_option,
                answered_at=now,
                duration_ms=active_duration_ms,
                correct=is_correct,
                marks=q['marks'] if is_correct else 0,
                is_final=False
            )
            if previous:
                conn.execute(db.answers.update().where(db.answers.c.session_id == sid, db.answers.c.question_id == question_id).values(**values))
            else:
                conn.execute(db.answers.insert().values(session_id=sid, question_id=question_id, **values))
            
            resource_ids = q.get('resource_ids', [])
            res_rows = []
            if resource_ids:
                res_rows = list(conn.execute(select(db.resources.c.content).where(db.resources.c.id.in_(resource_ids))).scalars())
            
            conn.commit()
            return {
                'question_id': question_id,
                'selected_option': selected_option,
                'correct_option_id': q['correct_option_id'],
                'is_correct': is_correct,
                'marks': q['marks'] if is_correct else 0,
                'total_marks': q['marks'],
                'base_explanation': q.get('base_explanation') or '',
                'resources': res_rows
            }
        except BaseException:
            conn.rollback()
            raise
