import json
import pytest
from sqlalchemy import create_engine
from app.assessment import db, service, cli, dataset
from app.config import settings

def test_offline_export_requires_salt_and_never_overwrites_existing_file(engine, tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'engine', engine)
    monkeypatch.setattr(settings, 'ML_EXPORT_SALT', '')
    target = tmp_path / 'private.jsonl'
    with pytest.raises(ValueError, match='ML_EXPORT_SALT'): cli.export_training(target)
    assert not target.exists()
    target.write_text('existing private dataset', encoding='utf-8')
    monkeypatch.setattr(settings, 'ML_EXPORT_SALT', 'dataset-test-only-salt-12345678901234567890')
    with pytest.raises(FileExistsError): cli.export_training(target)
    assert target.read_text() == 'existing private dataset'

def test_export_development_requires_opt_in_and_contains_no_raw_identity(engine, student, tmp_path, monkeypatch):
    sid = service.start(engine, student, service.Start(paper_id='physics-development-v1'))['session_id']
    service.save_answers(engine, sid, student, service.AnswerRequest(answers=[]), final=True)
    monkeypatch.setattr(db, 'engine', engine)
    monkeypatch.setattr(settings, 'ML_EXPORT_SALT', 'dataset-test-only-salt-12345678901234567890')
    assert cli.export_training(tmp_path / 'default.jsonl') == 0
    target = tmp_path / 'opt-in.jsonl'
    assert cli.export_training(target, True) == 3
    text = target.read_text()
    assert student.student_id not in text
    assert settings.ML_EXPORT_SALT not in text
    records = [json.loads(line) for line in text.splitlines()]
    assert all(r['labels']['outcome'] == 'unanswered' for r in records)

def test_failed_export_removes_only_its_new_partial_file(engine, tmp_path, monkeypatch):
    def failed(*args):
        yield {'synthetic': 1}
        raise RuntimeError('Synthetic export failure')
    monkeypatch.setattr(db, 'engine', engine)
    monkeypatch.setattr(settings, 'ML_EXPORT_SALT', 'dataset-test-only-salt-12345678901234567890')
    monkeypatch.setattr(dataset, 'training_records', failed)
    target = tmp_path / 'partial.jsonl'
    with pytest.raises(RuntimeError): cli.export_training(target)
    assert not target.exists()

def test_migrations_use_direct_neon_endpoint_and_preserve_connection_options(monkeypatch):
    pooled = create_engine('postgresql+psycopg://user:placeholder@ep-test-pooler.region.aws.neon.tech/db?sslmode=require')
    monkeypatch.setattr(db, 'engine', pooled)
    monkeypatch.setattr(settings, 'DATABASE_URL_UNPOOLED', '')
    calls = []
    monkeypatch.setattr(db, 'make_engine', lambda url: calls.append(url) or 'direct-engine')
    assert db.migration_engine() == 'direct-engine'
    assert calls == ['postgresql+psycopg://user:placeholder@ep-test.region.aws.neon.tech/db?sslmode=require']
    monkeypatch.setattr(settings, 'DATABASE_URL_UNPOOLED', 'postgresql://user:placeholder@explicit.example/db')
    assert db.migration_engine() == 'direct-engine'
    assert calls[-1] == settings.DATABASE_URL_UNPOOLED
