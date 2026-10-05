import pytest
from app.config import settings
from app import server

def test_host_start_uses_configured_port_and_host(monkeypatch):
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'production')
    monkeypatch.setattr(settings, 'DATABASE_URL', 'postgresql://user:placeholder@db.example/app')
    monkeypatch.setattr(settings, 'ASSESSMENT_BRIDGE_SECRET', 'a' * 32)
    monkeypatch.setattr(settings, 'ALLOW_DEVELOPMENT_CONTENT', False)
    monkeypatch.setattr(settings, 'HOST', '0.0.0.0')
    monkeypatch.setattr(settings, 'PORT', 9187)
    calls = []
    monkeypatch.setattr(server.uvicorn, 'run', lambda *args, **kwargs: calls.append((args, kwargs)))
    server.main()
    assert calls == [(('app.main:app',), {'host': '0.0.0.0', 'port': 9187})]

@pytest.mark.parametrize('field,value', [('DATABASE_URL', 'sqlite:///local.db'), ('ASSESSMENT_BRIDGE_SECRET', ''), ('ALLOW_DEVELOPMENT_CONTENT', True)])
def test_production_rejects_development_or_missing_server_config(monkeypatch, field, value):
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'production')
    monkeypatch.setattr(settings, 'DATABASE_URL', 'postgresql://user:placeholder@db.example/app')
    monkeypatch.setattr(settings, 'ASSESSMENT_BRIDGE_SECRET', 'a' * 32)
    monkeypatch.setattr(settings, 'ALLOW_DEVELOPMENT_CONTENT', False)
    monkeypatch.setattr(settings, field, value)
    with pytest.raises(SystemExit): server.main()
