"""Durable learning evidence and reproducible selection from published question versions."""
import math
from collections import defaultdict
from fastapi import HTTPException
from sqlalchemy import select
from app.assessment import db, service

STRATEGY = 'weak-concepts-and-retention-v1'

def save_record(conn, sid):
    if conn.execute(select(db.learning_records.c.session_id).where(db.learning_records.c.session_id == sid)).first():
        return
    session = conn.execute(select(db.sessions).where(db.sessions.c.id == sid)).mappings().one()
    if session['status'] != 'submitted': return
    paper = conn.execute(select(db.papers.c.content).where(db.papers.c.id == session['paper_id'])).scalar_one()
    answers = {r['question_id']: r for r in conn.execute(select(db.answers).where(db.answers.c.session_id == sid)).mappings()}
    questions = service.question_rows(conn, sid)
    concept_map = {c['id']: c for c in conn.execute(select(db.concepts).where(db.concepts.c.id.in_({q['concept_id'] for q in questions}))).mappings()}
    unit_map = {u['id']: u for u in conn.execute(select(db.units).where(db.units.c.id.in_({c['unit_id'] for c in concept_map.values()}))).mappings()}
    subject_map = {s['id']: s for s in conn.execute(select(db.subjects).where(db.subjects.c.id.in_({u['subject_id'] for u in unit_map.values()}))).mappings()}
    concepts = {}
    for q in questions:
        c = concept_map[q['concept_id']]
        unit = unit_map[c['unit_id']]
        subject = subject_map[unit['subject_id']]
        item = concepts.setdefault(c['id'], dict(concept_id=c['id'], concept_name=c['name'], unit_name=unit['name'], subject_id=subject['id'], subject_name=subject['name'], correct=0, incorrect=0, unanswered=0, awarded_marks=0, total_marks=0, question_ids=[], missed_question_ids=[], resource_ids=[]))
        a = answers[q['id']]
        outcome = 'unanswered' if a['selected_option'] is None else 'correct' if a['correct'] else 'incorrect'
        item[outcome] += 1
        item['awarded_marks'] += a['marks']
        item['total_marks'] += q['marks']
        item['question_ids'].append(q['id'])
        if outcome != 'correct': item['missed_question_ids'].append(q['id'])
        item['resource_ids'] = sorted(set(item['resource_ids']) | set(q['resource_ids']))
    for item in concepts.values(): item['percentage'] = round(100 * item['awarded_marks'] / item['total_marks'], 2)
    plan = conn.execute(select(db.plans.c.content).where(db.plans.c.session_id == sid)).scalar_one_or_none()
    seen = set(conn.execute(select(db.presented.c.question_id).join(db.sessions).where(db.sessions.c.student_id == session['student_id'], db.sessions.c.status == 'submitted', db.sessions.c.id != sid, db.sessions.c.submitted_at <= session['submitted_at'])).scalars())
    repeated = [q for item in concepts.values() for q in item['question_ids'] if q in seen]
    content = dict(version=1, session_id=sid, paper_id=paper['id'], title=paper['title'] if not plan else 'Personalized follow-up', language=session['language'], content_language=paper.get('content_language', 'en'), activity_type=session['activity_type'], is_development=session['is_development'], submitted_at=session['submitted_at'], score=session['score'], repeated_question_ids=repeated, concepts=list(concepts.values()), plan=plan)
    conn.execute(db.learning_records.insert().values(session_id=sid, content=content))

def history(conn, identity):
    records = list(conn.execute(select(db.learning_records.c.content).join(db.sessions).where(db.sessions.c.student_id == identity.student_id).order_by(db.sessions.c.submitted_at, db.sessions.c.id)).scalars())
    grouped = defaultdict(list)
    for record in records:
        for c in record['concepts']:
            grouped[(c['concept_id'], record['content_language'])].append((record, c))
    progress = []
    for (_, language), evidence in grouped.items():
        first, latest = evidence[0][1], evidence[-1][1]
        previous = evidence[-2][1] if len(evidence) > 1 else None
        streak = 0
        for _, c in reversed(evidence):
            if not c['missed_question_ids']: break
            streak += 1
        progress.append(dict(concept_id=latest['concept_id'], concept_name=latest['concept_name'], unit_name=latest['unit_name'], subject_id=latest['subject_id'], subject_name=latest['subject_name'], content_language=language, attempts=len(evidence), first_percentage=first['percentage'], latest_percentage=latest['percentage'], change_from_first=round(latest['percentage']-first['percentage'], 2) if len(evidence) > 1 else None, change_from_previous=round(latest['percentage']-previous['percentage'], 2) if previous else None, consecutive_missed_attempts=streak, latest_session_id=evidence[-1][0]['session_id'], resource_ids=latest['resource_ids'], recommendation='Revise this theory, then try a different question.' if latest['missed_question_ids'] else 'Revisit this topic in a later paper to check retention.', timeline=[dict(session_id=r['session_id'], submitted_at=r['submitted_at'], percentage=c['percentage'], correct=c['correct'], incorrect=c['incorrect'], unanswered=c['unanswered'], repeated_questions=len(set(c['question_ids']) & set(r['repeated_question_ids'])), activity_type=r['activity_type']) for r,c in evidence]))
    progress.sort(key=lambda c: (c['latest_percentage'], -c['consecutive_missed_attempts'], c['concept_name']))
    return dict(attempts=list(reversed(records)), concepts=progress, completed_count=len(records), interpretation='Topic score changes are evidence from these questions, not a mastery estimate. Papers can differ in difficulty and coverage; repeated questions and adaptive practice are identified separately.')

def recommend(conn, sid, identity, count=10):
    source = service.owned(conn, sid, identity)
    if source['status'] != 'submitted': raise HTTPException(409, 'Submit this paper before planning the next one')
    existing = conn.execute(select(db.plans.c.content).where(db.plans.c.source_session_id == sid)).scalar_one_or_none()
    if existing: return existing
    record = conn.execute(select(db.learning_records.c.content).where(db.learning_records.c.session_id == sid)).scalar_one()
    source_paper = conn.execute(select(db.papers.c.content).where(db.papers.c.id == source['paper_id'])).scalar_one()
    subjects = {c['subject_id'] for c in record['concepts']}
    available = [p for p in service.paper_list(conn, identity) if p['subject_id'] in subjects and p['content_language'] == record['content_language'] and p['is_development'] == source_paper['is_development']]
    # Membership in an accessible published paper is the approval boundary.
    bank = {q['id']: q for q in conn.execute(select(db.questions.c.content).join(db.composition).where(db.composition.c.paper_id.in_([p['id'] for p in available]))).scalars()}
    if not bank: raise HTTPException(409, 'No published questions available for a follow-up')
    records = history(conn, identity)['attempts']
    latest = {}
    exposures = defaultdict(int)
    last_seen = {}
    for r in reversed(records):
        if r['content_language'] != record['content_language']: continue
        for c in r['concepts']:
            if c['subject_id'] not in subjects: continue
            latest[c['concept_id']] = c
            for qid in c['question_ids']:
                exposures[qid] += 1
                last_seen[qid] = r['submitted_at']
    weak = {cid for cid,c in latest.items() if c['missed_question_ids']}
    retained = set(latest) - weak
    def rank(q):
        c = latest.get(q['concept_id'])
        return (exposures[q['id']] > 0, c['percentage'] if c else 0, exposures[q['id']], last_seen.get(q['id'], 0), q['id'])
    ordered = sorted(bank.values(), key=rank)
    size = min(count, len(ordered))
    selected, reasons = [], {}
    def take(candidates, limit, reason):
        # Rotate concepts so one weak topic cannot consume the whole quota.
        buckets = defaultdict(list)
        for q in candidates:
            if q['id'] not in reasons: buckets[q['concept_id']].append(q)
        while buckets and limit > 0 and len(selected) < size:
            for cid in list(buckets):
                if limit <= 0 or len(selected) >= size: break
                q = buckets[cid].pop(0)
                selected.append(q['id'])
                reasons[q['id']] = ('revise_missed_theory' if cid in weak else 'check_retention' if cid in retained else reason)
                limit -= 1
                if not buckets[cid]: del buckets[cid]
    take([q for q in ordered if q['concept_id'] in weak], math.ceil(size*.6), 'revise_missed_theory')
    take([q for q in ordered if q['concept_id'] in retained], max(1, math.ceil(size*.2)), 'check_retention')
    take(ordered, size, 'broaden_coverage')
    repeated = [qid for qid in selected if exposures[qid]]
    warnings = []
    if size < count: warnings.append(f'Only {size} eligible question versions are available; requested {count}.')
    if repeated: warnings.append(f'{len(repeated)} questions have appeared in your completed assessments. Expand the reviewed bank for more fresh questions.')
    return dict(strategy=STRATEGY, source_session_id=sid, paper_id=source['paper_id'], language=source['language'], question_ids=selected, question_count=size, requested_count=count, repeated_question_ids=repeated, target_concept_ids=sorted(weak), selections=[dict(question_id=qid, concept_id=bank[qid]['concept_id'], reason=reasons[qid], repeated=qid in repeated) for qid in selected], warnings=warnings, explanation='Target about 60% missed theory and 20% retention, then fill available coverage. Prefer unseen questions within each target; adapt proportions when the bank is limited.')

def start_next(engine, sid, identity, count):
    with engine.connect() as conn: plan = recommend(conn, sid, identity, count)
    return service.start(engine, identity, service.Start(paper_id=plan['paper_id'], language=plan['language']), plan=plan)
