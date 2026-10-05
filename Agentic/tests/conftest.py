import json
from pathlib import Path
import pytest
from app.assessment import db
from app.assessment.content import Package, import_package
from app.assessment.auth import Identity
from app.config import settings

class NoMedia:
    def read(self, record): raise AssertionError('No media expected')

@pytest.fixture
def package():
    return Package.model_validate_json((Path(__file__).parents[1] / 'fixtures/physics-development.json').read_text(encoding='utf-8'))

@pytest.fixture
def engine(tmp_path, package, monkeypatch):
    monkeypatch.setattr(settings, 'ALLOW_DEVELOPMENT_CONTENT', True)
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'development')
    engine = db.make_engine(f'sqlite:///{tmp_path / "assessment.db"}')
    db.metadata.create_all(engine)
    import_package(engine, package, NoMedia())
    yield engine
    engine.dispose()

@pytest.fixture
def student(): return Identity(student_id='dev-test-student', is_development=True)
