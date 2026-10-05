import asyncio
import io
import json
import httpx
import pytest
from fastapi import HTTPException
from PIL import Image
from sqlalchemy import select
from app.config import Settings, settings
from app.assessment import db, service
from app.assessment.content import Media, Package, import_package
from app.assessment.provider import AIMLProvider, ProviderFailure, reviewed_feedback, validate_feedback
from app.assessment.storage import Storage, MediaError
from app.assessment.worker import process_one
from app.assessment.provider import MockProvider
from test_assessments import start, submit, result

@pytest.fixture
def evidence(package):
    return {'question': package.questions[0].model_dump(), 'selected_option': 'a', 'resources': [package.resources[0].model_dump()], 'language': 'en'}

def test_provider_wire_contract_and_usage(evidence):
    def handle(request):
        payload = json.loads(request.content)
        assert request.url == 'https://api.aimlapi.com/v1/chat/completions'
        assert request.headers['authorization'] == 'Bearer test-key'
        assert payload['response_format']['type'] == 'json_schema'
        assert payload['model'] == 'gpt-4o-mini'
        return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {'content': reviewed_feedback(evidence).model_dump_json()}}], 'usage': {'total_tokens': 23, 'untrusted': 'ignored'}})
    p = AIMLProvider(Settings(AI_API_KEY='test-key'), httpx.MockTransport(handle))
    feedback, usage = asyncio.run(p.generate(evidence, []))
    assert feedback.correct_option_id == 'a' and usage == {'total_tokens': 23}

@pytest.mark.parametrize('mode,code,transient', [('json', 'invalid_model_response', False), ('timeout', 'provider_timeout_or_network', True), ('429', 'provider_rate_limit', True), ('503', 'provider_unavailable', True), ('401', 'provider_http_401', False)])
def test_provider_failures(evidence, mode, code, transient):
    def handle(req):
        if mode == 'timeout': raise httpx.ReadTimeout('contains confidential URL', request=req)
        if mode == 'json': return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {'content': '{bad'}}]})
        return httpx.Response(int(mode), text='must never log raw provider content')
    p = AIMLProvider(Settings(AI_API_KEY='test-key'), httpx.MockTransport(handle))
    with pytest.raises(ProviderFailure) as exc: asyncio.run(p.generate(evidence, []))
    assert exc.value.code == code and exc.value.transient == transient

@pytest.mark.parametrize('field,value', [('concept_id', 'unknown'), ('correct_option_id', 'b'), ('evidence_ids', ['unknown']), ('resource_ids', ['unknown']), ('contradiction', True), ('insufficient_evidence', True), ('possible_misconception', 'The student believes something'), ('explanation', 'Visit https://invented.example'), ('numeric_result', None)])
def test_feedback_grounding(evidence, field, value):
    f = reviewed_feedback(evidence); setattr(f, field, value)
    with pytest.raises(ProviderFailure): validate_feedback(f, evidence)

def test_unanswered_has_no_inferred_reasoning(evidence):
    evidence['selected_option'] = None
    f = reviewed_feedback(evidence); f.selected_option_explanation = 'You thought X'
    with pytest.raises(ProviderFailure): validate_feedback(f, evidence)

@pytest.mark.parametrize('key', ['../secret', 'C:/secret.png', 'http://127.0.0.1/private', 'approved/../secret', 'approved/%2e%2e/file', 'approved/a\\b', '/approved/image.png'])
def test_media_key_restrictions(key):
    with pytest.raises(ValueError): Media(id='image', object_key=key, mime_type='image/png', role='question')

def png():
    image = Image.new('RGB', (2, 2), 'white'); output = io.BytesIO(); image.save(output, format='PNG'); return output.getvalue()
def storage_config(**kw): return Settings(SUPABASE_URL='https://test.supabase.co', SUPABASE_KEY='test-key', **kw)
def media(): return Media(id='diagram', object_key='approved/diagram.png', mime_type='image/png', role='question').model_dump()

@pytest.mark.parametrize('mode', ['valid', 'public', 'oversized', 'bad_mime', 'bad_bytes', 'missing', 'redirect'])
def test_storage_bytes_privacy_and_size(mode):
    def handle(req):
        if '/bucket/' in req.url.path: return httpx.Response(200, json={'public': mode == 'public'})
        if mode == 'missing': return httpx.Response(404)
        if mode == 'redirect': return httpx.Response(302, headers={'location': 'http://127.0.0.1/secret'})
        return httpx.Response(200, content=b'invalid' if mode == 'bad_bytes' else png(), headers={'content-type': 'text/plain' if mode == 'bad_mime' else 'image/png'})
    storage = Storage(storage_config(MEDIA_MAX_BYTES=1 if mode == 'oversized' else 1024), httpx.MockTransport(handle))
    if mode == 'valid': assert storage.read(media()) == png()
    else:
        with pytest.raises(MediaError): storage.read(media())

def test_storage_no_arbitrary_origin():
    with pytest.raises(MediaError): Storage(Settings(SUPABASE_URL='http://127.0.0.1')).read(media())

def test_solution_image_authorization_and_no_vision_fallback(engine, student, package):
    p = package.model_dump()
    p['media'] = [media(), {**media(), 'id': 'solution', 'role': 'solution', 'object_key': 'approved/solution.png'}]
    p['questions'][0]['media_ids'] = ['diagram']; p['questions'][0]['solution_media_ids'] = ['solution']
    # New version IDs, preserving the original paper.
    p['paper']['id'] = 'image-paper-v1'
    for q in p['questions']: q['id'] += '-image'
    p['paper']['question_ids'] = [q['id'] for q in p['questions']]
    class TestStorage:
        def read(self, m): return png()
    import_package(engine, Package.model_validate(p), TestStorage())
    sid = service.start(engine, student, service.Start(paper_id='image-paper-v1'))['session_id']
    with engine.connect() as conn:
        assert service.allowed_media(conn, sid, 'diagram', student)['id'] == 'diagram'
        with pytest.raises(HTTPException): service.allowed_media(conn, sid, 'solution', student)
    service.save_answers(engine, sid, student, service.AnswerRequest(answers=[]), final=True)
    with engine.connect() as conn: assert service.allowed_media(conn, sid, 'solution', student)['role'] == 'solution'
    asyncio.run(process_one(engine, MockProvider()))
    r = result(engine, student, sid)
    assert r['questions'][0]['analysis']['fallback_reason'] == 'vision_unavailable_without_reviewed_transcription'

def test_missing_media_import_is_atomic(engine, package):
    p = package.model_dump(); p['media'] = [media()]; p['questions'][0]['media_ids'] = ['diagram']
    class Missing:
        def read(self, record): raise MediaError('Approved media unavailable')
    with pytest.raises(MediaError): import_package(engine, Package.model_validate(p), Missing())
    with engine.connect() as conn: assert conn.execute(select(db.media.c.id)).first() is None

def test_shared_solution_and_exam_object_rejected(package):
    p = package.model_dump()
    p['media'] = [media(), {**media(), 'id': 'solution', 'role': 'solution'}]
    with pytest.raises(ValueError, match='cannot be shared'): Package.model_validate(p)

def test_legacy_document_route_cannot_bypass_private_media():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    response = client.post('/api/documents/process', json={'storage_path': 'approved/solution.png', 'bucket_name': settings.ASSESSMENT_STORAGE_BUCKET})
    assert response.status_code == 403
    response = client.post('/api/documents/process', json={'storage_path': '../approved/solution.png'})
    assert response.status_code == 422

def test_missing_wrong_choice_explanation(evidence):
    evidence['selected_option'] = 'b'
    feedback = reviewed_feedback(evidence)
    feedback.selected_option_explanation = None
    with pytest.raises(ProviderFailure, match='missing_selected_option_explanation'):
        validate_feedback(feedback, evidence)
