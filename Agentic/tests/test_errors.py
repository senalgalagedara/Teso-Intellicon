"""Contract tests for the RFC 9457 problem+json exception handling boundary."""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.config import settings
from app.errors import AppError, install_exception_handlers
from app.main import app as main_app


def build_app():
    api = FastAPI()

    @api.get('/handled/{status}')
    def handled(status: int):
        raise HTTPException(status, 'Expected failure')

    @api.get('/app-error')
    def app_error():
        raise AppError(502, 'Upstream service failed', code='upstream_unavailable')

    class Body(BaseModel):
        name: str = Field(min_length=3)

    @api.post('/validate')
    def validate(body: Body):
        return body

    @api.get('/crash')
    def crash():
        raise RuntimeError('secret-database-dsn=postgres://user:pass@internal.host')

    install_exception_handlers(api)
    # raise_server_exceptions=False mirrors production: the generic 500 is
    # returned to the client instead of the original exception being re-raised.
    return TestClient(api, raise_server_exceptions=False)


def test_http_exception_maps_to_problem_details():
    client = build_app()
    response = client.get('/handled/404')
    assert response.status_code == 404
    assert response.headers['content-type'].startswith('application/problem+json')
    body = response.json()
    assert body['status'] == 404
    assert body['title'] == 'Not Found'
    assert body['detail'] == 'Expected failure'


def test_app_error_exposes_code_in_type():
    client = build_app()
    response = client.get('/app-error')
    assert response.status_code == 502
    body = response.json()
    assert body['type'] == 'upstream_unavailable'
    assert body['detail'] == 'Upstream service failed'


def test_validation_error_is_structured_and_safe():
    client = build_app()
    response = client.post('/validate', json={'name': 'x'})
    assert response.status_code == 422
    body = response.json()
    assert body['status'] == 422
    assert body['detail'] == 'Request validation failed'
    assert any(e['field'] == 'name' for e in body['errors'])


def test_unhandled_exception_is_generic_and_never_leaks_internals():
    client = build_app()
    response = client.get('/crash')
    assert response.status_code == 500
    body = response.json()
    assert body['status'] == 500
    assert body['title'] == 'Internal Server Error'
    assert 'postgres' not in body['detail']
    assert body['detail'] == 'An unexpected server error occurred. Please try again later.'


def test_main_app_returns_problem_details_and_request_id(monkeypatch):
    monkeypatch.setattr(settings, 'ASSESSMENT_BRIDGE_SECRET', 'x' * 32)
    client = TestClient(main_app)
    response = client.get('/api/assessments/papers')
    assert response.status_code == 401
    body = response.json()
    assert body['detail']
    assert body['status'] == 401
    assert isinstance(response.headers.get('x-request-id'), str) and response.headers['x-request-id']