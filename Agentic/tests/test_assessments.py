import asyncio
import base64
import hashlib
import hmac
import json
import time
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from app.config import settings
from app.main import app
from app.assessment import db, service
from app.assessment.auth import Identity
from app.assessment.content import Package, import_package
from app.assessment.api_schemas import Results
from app.assessment.provider import MockProvider, ProviderFailure, reviewed_feedback
from app.assessment.worker import process_one, claim
from conftest import NoMedia

def start(engine, student):
    return service.start(engine, student, service.Start(paper_id='physics-development-v1'))['session_id']
def body(*pairs):
    return service.AnswerRequest(answers=[service.Choice(question_id=q, selected_option=o) for q, o in pairs])
def submit(engine, student, sid=None):
    sid = sid or start(engine, student)
    service.save_answers(engine, sid, student, body(('force-dev-v1', 'a'), ('speed-dev-v1', 'a')), final=True)
    return sid
def result(engine, student, sid):
    with engine.connect() as conn: return service.results(conn, sid, student)

def test_grading_unanswered_and_restart(engine, student):
    sid = submit(engine, student)
    r = result(engine, student, sid)
    assert r['score'] == dict(correct=1, incorrect=1, unanswered=1, awarded_marks=2, total_marks=5, percentage=40)
    assert r['questions'][2]['answer']['correct'] is None
    assert r['questions'][0]['answer']['hint_exposed'] is None
    assert r['questions'][0]['answer']['duration_ms'] is None
    assert {c['concept_id'] for c in r['concepts'] if c['incorrect'] or c['unanswered']} == set(r['revision_concept_ids'])
    assert r['units'][0]['percentage'] == round(200 / 3, 2)
    Results.model_validate(r)
    url = str(engine.url)
    engine.dispose()
    reopened = db.make_engine(url)
    assert result(reopened, student, sid)['score'] == r['score']
    reopened.dispose()

@pytest.mark.parametrize('qid,option', [('other-version', 'a'), ('force-dev-v1', 'not-an-option')])
def test_invalid_membership_transaction(engine, student, qid, option):
    sid = start(engine, student)
    with pytest.raises(HTTPException) as exc:
        service.save_answers(engine, sid, student, body(('speed-dev-v1', 'b'), (qid, option)), final=True)
    assert exc.value.status_code == 422
    with engine.connect() as conn:
        assert conn.execute(select(func.count()).select_from(db.answers)).scalar() == 0
        assert conn.execute(select(func.count()).select_from(db.jobs)).scalar() == 0

def test_ownership_and_no_leak(engine, student):
    sid = start(engine, student)
    other = Identity(student_id='dev-other', is_development=True)
    with engine.connect() as conn:
        raw = json.dumps(service.exam(conn, sid, student))
        for key in ('correct_option_id', 'base_explanation', 'solution_media_ids', 'resource_ids', 'numeric_result'):
            assert key not in raw
        with pytest.raises(HTTPException): service.exam(conn, sid, other)
        with pytest.raises(HTTPException): service.results(conn, sid, student)
    with pytest.raises(HTTPException): service.save_answers(engine, sid, other, body(), final=True)

def test_drafts_final_authoritative_and_idempotent(engine, student):
    sid = start(engine, student)
    service.save_answers(engine, sid, student, body(('wave-dev-v1', 'c')))
    with engine.connect() as conn: assert service.exam(conn, sid, student)['drafts']['wave-dev-v1'] == 'c'
    first = service.save_answers(engine, sid, student, body(('force-dev-v1', 'a')), final=True)
    again = service.save_answers(engine, sid, student, body(('force-dev-v1', 'b')), final=True)
    assert first == again
    assert first['score']['unanswered'] == 2
    with engine.connect() as conn:
        assert conn.execute(select(func.count()).select_from(db.jobs)).scalar() == 1
        assert conn.execute(select(func.count()).select_from(db.answers)).scalar() == 3
    with pytest.raises(HTTPException): service.save_answers(engine, sid, student, body())

def test_draft_observed_duration_and_timestamp_survive_final(engine, student):
    sid = start(engine, student)
    observed = service.AnswerRequest(answers=[service.Choice(question_id='force-dev-v1', selected_option='a', active_duration_ms=1234)])
    service.save_answers(engine, sid, student, observed)
    with engine.connect() as conn:
        timestamp = service.exam(conn, sid, student)['drafts']['force-dev-v1']
        saved_time = conn.execute(select(db.answers.c.answered_at).where(db.answers.c.session_id == sid)).scalar_one()
    service.save_answers(engine, sid, student, body(('force-dev-v1', timestamp)), final=True)
    answer = result(engine, student, sid)['questions'][0]['answer']
    assert answer['duration_ms'] == 1234 and answer['answered_at'] == saved_time

def test_duplicate_concurrent_submission(engine, student):
    sid = start(engine, student)
    def do_submit(_): return service.save_answers(engine, sid, student, body(('force-dev-v1', 'a')), final=True)
    with ThreadPoolExecutor(max_workers=3) as pool: responses = list(pool.map(do_submit, range(3)))
    assert responses[0] == responses[1] == responses[2]
    with engine.connect() as conn: assert conn.execute(select(func.count()).select_from(db.jobs)).scalar() == 1

def test_real_first_response_statistics_excludes_dev_and_practice(engine, student):
    sid = submit(engine, student)
    with engine.connect() as conn: assert service.success_rate(conn, 'force-dev-v1')['percentage'] is None
    # These are synthetic test rows ONLY in a temporary database, never production imports.
    for i, option in enumerate(['a', None]):
        identity = Identity(student_id=f'dev-stat-{i}', is_development=True)
        first = start(engine, identity)
        service.save_answers(engine, first, identity, body(('force-dev-v1', option)), final=True)
        second = start(engine, identity)
        service.save_answers(engine, second, identity, body(('force-dev-v1', 'a')), final=True)
        with engine.begin() as conn:
            conn.execute(db.sessions.update().where(db.sessions.c.id.in_([first, second])).values(is_development=False))
    with engine.begin() as conn: conn.execute(db.sessions.update().where(db.sessions.c.id == sid).values(is_development=False, activity_type='assisted_practice'))
    with engine.connect() as conn:
        rate = service.success_rate(conn, 'force-dev-v1')
        assert (rate['numerator'], rate['denominator'], rate['percentage'], rate['sample_label']) == (1, 2, 50, 'small_sample')

def test_import_idempotent_immutable_and_validation(engine, package):
    import_package(engine, package, NoMedia())
    changed = package.model_dump(); changed['questions'][0]['text'] = 'Changed'
    with pytest.raises(ValueError, match='Immutable'): import_package(engine, Package.model_validate(changed), NoMedia())
    with engine.connect() as conn: assert conn.execute(select(func.count()).select_from(db.questions)).scalar() == 3

@pytest.mark.parametrize('change', ['bad_key', 'duplicate', 'bad_concept', 'bad_media', 'bad_marks', 'bad_paper', 'fake_review'])
def test_content_package_rejections(package, change):
    p = package.model_dump()
    if change == 'bad_key': p['questions'][0]['correct_option_id'] = 'x'
    elif change == 'duplicate': p['questions'][0]['options'][1]['id'] = 'a'
    elif change == 'bad_concept': p['questions'][0]['concept_id'] = 'unknown'
    elif change == 'bad_media': p['questions'][0]['media_ids'] = ['missing']
    elif change == 'bad_marks': p['questions'][0]['marks'] = 0
    elif change == 'bad_paper': p['paper']['question_ids'] = ['unknown']
    else: p['paper']['review_status'] = 'reviewed'
    with pytest.raises(ValueError): Package.model_validate(p)

def test_worker_persistence_and_no_regeneration(engine, student):
    sid = submit(engine, student)
    assert asyncio.run(process_one(engine, MockProvider()))
    r = result(engine, student, sid)
    assert r['analysis_status'] == 'completed'
    assert all(q['analysis']['status'] == 'mock' for q in r['questions'])
    assert not asyncio.run(process_one(engine, MockProvider()))
    assert r['questions'][2]['analysis']['feedback']['possible_misconception'] is None
    Results.model_validate(r)

def test_job_claim_recovery_and_fencing(engine, student):
    submit(engine, student)
    first = claim(engine)
    assert first and claim(engine) is None
    with engine.begin() as conn: conn.execute(db.jobs.update().values(lease_until=0))
    second = claim(engine)
    assert second and second['claim_token'] != first['claim_token']
    from app.assessment.worker import renew
    with engine.begin() as conn:
        with pytest.raises(ProviderFailure, match='lost_job_lease'): renew(conn, first)

def test_concurrent_job_claim(engine, student):
    submit(engine, student)
    with ThreadPoolExecutor(max_workers=3) as pool: claims = list(pool.map(lambda _: claim(engine), range(3)))
    assert sum(c is not None for c in claims) == 1

def test_retry_keeps_successful_questions_and_bounded_fallback(engine, student, monkeypatch):
    sid = submit(engine, student)
    calls = []
    class Provider(MockProvider):
        name = 'test-live'
        async def generate(self, evidence, images):
            qid = evidence['question']['id']; calls.append(qid)
            if qid == 'speed-dev-v1': raise ProviderFailure('provider_rate_limit', True)
            return reviewed_feedback(evidence), {}
    monkeypatch.setattr(settings, 'AI_MAX_RETRIES', 2)
    asyncio.run(process_one(engine, Provider()))
    assert result(engine, student, sid)['analysis_status'] == 'queued'
    with engine.begin() as conn: conn.execute(db.jobs.update().values(available_at=0))
    asyncio.run(process_one(engine, Provider()))
    r = result(engine, student, sid)
    assert calls.count('force-dev-v1') == 1
    assert calls.count('speed-dev-v1') == 2
    assert r['analysis_status'] == 'partial'
    assert r['questions'][1]['analysis']['fallback_reason'] == 'provider_rate_limit'
    assert r['score']['percentage'] == 40

def test_per_question_invalid_model_fallback(engine, student):
    sid = submit(engine, student)
    class Provider(MockProvider):
        name = 'test'
        async def generate(self, evidence, images):
            f = reviewed_feedback(evidence)
            if evidence['question']['id'] == 'force-dev-v1': f.evidence_ids.append('invented')
            return f, {}
    asyncio.run(process_one(engine, Provider()))
    r = result(engine, student, sid)
    assert [q['analysis']['status'] for q in r['questions']] == ['reviewed_fallback', 'ai_generated', 'ai_generated']

def test_failed_job_retains_grade(engine, student):
    sid = submit(engine, student)
    with engine.begin() as conn: conn.execute(db.jobs.update().values(state='failed', error_code='test_failure'))
    assert result(engine, student, sid)['score']['percentage'] == 40

def test_api_signed_identity_body_binding_and_schema(engine, student, monkeypatch):
    monkeypatch.setattr(db, 'engine', engine)
    monkeypatch.setattr(settings, 'ASSESSMENT_BRIDGE_SECRET', 'test-secret-' * 4)
    client = TestClient(app)
    def request(method, path, payload=None, identity=student, age=0):
        content = json.dumps(payload) if payload is not None else ''
        data = dict(student_id=identity.student_id, is_development=identity.is_development, issued_at=time.time() - age, method=method, path=path, body_sha256=hashlib.sha256(content.encode()).hexdigest())
        value = base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')
        sig = hmac.new(settings.ASSESSMENT_BRIDGE_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()
        return client.request(method, path, content=content, headers={'x-teso-identity': value + '.' + sig, 'content-type': 'application/json'})
    assert client.get('/api/assessments/papers', headers={'x-student-id': student.student_id}).status_code == 401
    assert request('GET', '/api/assessments/papers', age=120).status_code == 401
    response = request('POST', '/api/assessments/sessions', {'paper_id': 'physics-development-v1'})
    assert response.status_code == 200
    sid = response.json()['session_id']
    assert request('GET', f'/api/assessments/sessions/{sid}').status_code == 200
    assert request('GET', f'/api/assessments/sessions/{sid}', identity=Identity(student_id='dev-other', is_development=True)).status_code == 404
    assert request('POST', f'/api/assessments/sessions/{sid}/submit', {'answers': [], 'score': 100}).status_code == 422
    assert request('POST', f'/api/assessments/sessions/{sid}/submit', {'answers': []}).status_code == 200
    assert request('GET', f'/api/assessments/sessions/{sid}/results').json()['score']['unanswered'] == 3
    signed = request('GET', '/api/assessments/papers').request.headers['x-teso-identity']
    assert client.post('/api/assessments/sessions', json={}, headers={'x-teso-identity': signed}).status_code == 401
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'production')
    assert request('GET', '/api/assessments/papers').status_code == 401
