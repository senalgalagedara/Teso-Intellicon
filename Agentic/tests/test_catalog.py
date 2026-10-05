"""Catalog integrity and migration checks use isolated SQLite databases only."""
import asyncio
import hashlib
import io

import httpx
import pytest
from fastapi import HTTPException
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.assessment import db, service
from app.assessment.auth import Identity
from app.assessment.cli import migrate
from app.assessment.content import Package, import_package
from app.assessment.provider import reviewed_feedback
from app.assessment.storage import MediaError, Storage
from app.assessment.worker import process_one
from app.config import Settings, settings
from conftest import NoMedia

catalog = db.catalog


def rows(conn, table):
    return [dict(row) for row in conn.execute(select(table)).mappings()]


def snapshot(conn, tables):
    return {table.name: rows(conn, table) for table in tables}


def legacy_content(package):
    """The JSON shape saved before the catalog existed, including old defaults."""
    content = package.model_dump()
    for question in content['questions']:
        question.pop('family_id')
        question.pop('language')
    for resource in content['resources']:
        resource.pop('language')
        resource.pop('media_ids')
    content['paper'].pop('subject_version')
    return content


def write_legacy(conn, content):
    for name, table in [('subjects', db.subjects), ('units', db.units), ('concepts', db.concepts)]:
        conn.execute(table.insert(), content[name])
    for resource in content['resources']:
        conn.execute(db.resources.insert().values(id=resource['id'], concept_id=resource['concept_id'], content=resource))
    for question in content['questions']:
        conn.execute(db.questions.insert().values(id=question['id'], concept_id=question['concept_id'], content=question))
        conn.execute(db.options.insert(), [{'question_id': question['id'], 'id': option['id'], 'content': option} for option in question['options']])
        conn.execute(db.keys.insert().values(question_id=question['id'], option_id=question['correct_option_id']))
    write_legacy_paper(conn, content['paper'])


def write_legacy_paper(conn, paper):
    conn.execute(db.papers.insert().values(id=paper['id'], content=paper))
    conn.execute(db.composition.insert(), [{'paper_id': paper['id'], 'question_id': qid, 'position': position} for position, qid in enumerate(paper['question_ids'])])


@pytest.fixture
def legacy_engine(tmp_path, package, monkeypatch):
    monkeypatch.setattr(settings, 'ALLOW_DEVELOPMENT_CONTENT', True)
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'development')
    engine = db.make_engine(f'sqlite:///{tmp_path / "legacy-assessment.db"}')
    db.metadata.create_all(engine, tables=[table for table in db.metadata.sorted_tables if table not in catalog.TABLES])
    with engine.begin() as conn:
        write_legacy(conn, legacy_content(package))
    yield engine
    engine.dispose()


def translated(package, language, suffix='translated', grouped=True):
    content = package.model_dump()
    resource_ids = {resource['id']: resource['id'] + '-' + suffix + '-' + language for resource in content['resources']}
    for resource in content['resources']:
        resource['id'] = resource_ids[resource['id']]
        resource['language'] = language
    for question in content['questions']:
        old_id = question['id']
        question['id'] = old_id + '-' + suffix + '-' + language
        question['family_id'] = 'canonical-' + old_id if grouped else None
        question['language'] = language
        question['resource_ids'] = [resource_ids[rid] for rid in question['resource_ids']]
    content['paper']['id'] = 'physics-' + suffix + '-' + language + '-v1'
    content['paper']['content_language'] = language
    content['paper']['question_ids'] = [question['id'] for question in content['questions']]
    return content


def png(color='white'):
    output = io.BytesIO()
    Image.new('RGB', (2, 2), color).save(output, format='PNG')
    return output.getvalue()


class ImageBytes:
    def __init__(self, data=None):
        self.data = png() if data is None else data

    def read(self, record):
        return self.data


def image_package(package):
    content = translated(package, 'en', suffix='images', grouped=False)
    specs = [('diagram-a', 'question'), ('diagram-b', 'question'), ('option-image', 'option'), ('solution-image', 'solution'), ('theory-a', 'theory'), ('theory-b', 'theory')]
    content['media'] = [{'id': mid, 'object_key': f'approved/{mid}.png', 'mime_type': 'image/png', 'role': role, 'bucket_id': settings.ASSESSMENT_STORAGE_BUCKET} for mid, role in specs]
    content['questions'][0]['media_ids'] = ['diagram-a', 'diagram-b']
    content['questions'][0]['options'][0]['media_ids'] = ['option-image']
    content['questions'][0]['solution_media_ids'] = ['solution-image']
    content['resources'][0]['media_ids'] = ['theory-a', 'theory-b']
    return Package.model_validate(content)


def test_catalog_migration_preserves_legacy_grades_json_and_history(legacy_engine, student, package):
    sid = service.start(legacy_engine, student, service.Start(paper_id=package.paper.id))['session_id']
    service.save_answers(legacy_engine, sid, student, service.AnswerRequest(answers=[service.Choice(question_id='force-dev-v1', selected_option='a'), service.Choice(question_id='speed-dev-v1', selected_option='a')]), final=True)
    preserved = (db.questions, db.resources, db.options, db.keys, db.papers, db.composition, db.sessions, db.answers, db.presented, db.jobs, db.learning_records)
    with legacy_engine.connect() as conn:
        before = snapshot(conn, preserved)
        assert before[db.sessions.name][0]['score']['percentage'] == 40
    migrate(legacy_engine)
    migrate(legacy_engine)
    import_package(legacy_engine, package, NoMedia())
    with legacy_engine.connect() as conn:
        assert snapshot(conn, preserved) == before
        assert conn.execute(select(db.schema_versions.c.version).order_by(db.schema_versions.c.version)).scalars().all() == [1, 2, 3]
        details = rows(conn, catalog.questions)
        assert len(details) == 3
        assert {detail['language_id'] for detail in details} == {'en'}
        assert {detail['topic_id'] for detail in details} == {'force-dev', 'speed-dev', 'wave-speed-dev'}
        assert len(rows(conn, catalog.choices)) == 9
        assert len(rows(conn, catalog.question_theories)) == 3
        assert service.results(conn, sid, student)['score'] == before[db.sessions.name][0]['score']


def test_explicit_question_families_group_translations_without_merging_options(engine, package):
    for language in ['en', 'si', 'ta']:
        import_package(engine, Package.model_validate(translated(package, language)), NoMedia())
    with engine.connect() as conn:
        details = conn.execute(select(catalog.questions).where(catalog.questions.c.family_id == 'canonical-force-dev-v1')).mappings().all()
        assert len(details) == 3
        assert {detail['language_id'] for detail in details} == {'en', 'si', 'ta'}
        assert len({detail['correct_answer_id'] for detail in details}) == 3
        versions = conn.execute(select(catalog.subject_versions.c.language_id).where(catalog.subject_versions.c.subject_id == 'physics-dev')).scalars().all()
        assert set(versions) == {'en', 'si', 'ta'}
        assert len(rows(conn, db.subjects)) == 1
        assert len(rows(conn, catalog.topics)) == 3


def test_family_is_not_guessed_from_question_id(engine, package):
    content = translated(package, 'si', suffix='unrelated', grouped=False)
    import_package(engine, Package.model_validate(content), NoMedia())
    with engine.connect() as conn:
        qid = content['questions'][0]['id']
        detail = conn.execute(select(catalog.questions).where(catalog.questions.c.id == qid)).mappings().one()
        assert detail['family_id'] == qid
        assert detail['family_id'] != 'force-dev-v1'


@pytest.mark.parametrize('values', [
    {'primary_theory_id': 'speed-theory-dev-v1'},
    {'correct_answer_id': catalog.answer_id('speed-dev-v1', 'a')},
    {'topic_id': 'speed-dev'},
    {'subject_id': 'missing-subject'},
    {'language_id': 'si'},
])
def test_catalog_question_composite_foreign_keys_prevent_cross_content_links(engine, values):
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(catalog.questions.update().where(catalog.questions.c.id == 'force-dev-v1').values(**values))
    with engine.connect() as conn:
        detail = conn.execute(select(catalog.questions).where(catalog.questions.c.id == 'force-dev-v1')).mappings().one()
        assert detail['topic_id'] == 'force-dev'
        assert detail['language_id'] == 'en'
        assert detail['correct_answer_id'] == catalog.answer_id('force-dev-v1', 'a')


def test_theory_links_require_same_topic_and_language(engine, package):
    si = Package.model_validate(translated(package, 'si'))
    import_package(engine, si, NoMedia())
    for theory_id in ['speed-theory-dev-v1', si.resources[0].id]:
        with pytest.raises(IntegrityError), engine.begin() as conn:
            conn.execute(catalog.question_theories.insert().values(question_id='force-dev-v1', theory_id=theory_id, topic_id='force-dev', language_id='en', position=1))


def test_import_and_migration_are_repeatable(engine, package):
    migrate(engine)
    with engine.connect() as conn:
        before = snapshot(conn, db.metadata.sorted_tables)
    import_package(engine, package, NoMedia())
    migrate(engine)
    import_package(engine, package, NoMedia())
    with engine.connect() as conn:
        assert snapshot(conn, db.metadata.sorted_tables) == before


def test_image_bucket_metadata_ordered_links_and_submission_access(engine, student, package):
    content = image_package(package)
    data = png()
    import_package(engine, content, ImageBytes(data))
    sid = service.start(engine, student, service.Start(paper_id=content.paper.id))['session_id']
    other = Identity(student_id='dev-other-catalog-student', is_development=True)
    with engine.connect() as conn:
        images = rows(conn, catalog.images)
        assert len(images) == 6
        assert {image['bucket_id'] for image in images} == {settings.ASSESSMENT_STORAGE_BUCKET}
        assert {image['sha256'] for image in images} == {hashlib.sha256(data).hexdigest()}
        assert {image['byte_size'] for image in images} == {len(data)}
        diagram_ids = conn.execute(select(catalog.question_images.c.image_id).where(catalog.question_images.c.question_id == content.questions[0].id, catalog.question_images.c.role == 'question').order_by(catalog.question_images.c.position)).scalars().all()
        assert diagram_ids == ['diagram-a', 'diagram-b']
        theory_ids = conn.execute(select(catalog.theory_images.c.image_id).where(catalog.theory_images.c.theory_id == content.resources[0].id).order_by(catalog.theory_images.c.position)).scalars().all()
        assert theory_ids == ['theory-a', 'theory-b']
        assert rows(conn, catalog.choice_images)[0]['answer_id'] == catalog.answer_id(content.questions[0].id, 'a')
        for mid in ['diagram-a', 'diagram-b', 'option-image']:
            assert service.allowed_media(conn, sid, mid, student)['id'] == mid
        for mid in ['theory-a', 'theory-b', 'solution-image']:
            with pytest.raises(HTTPException) as exc:
                service.allowed_media(conn, sid, mid, student)
            assert exc.value.status_code == 404
    service.save_answers(engine, sid, student, service.AnswerRequest(answers=[]), final=True)
    with engine.connect() as conn:
        for mid in ['theory-a', 'theory-b', 'solution-image']:
            assert service.allowed_media(conn, sid, mid, student)['id'] == mid
            with pytest.raises(HTTPException) as exc:
                service.allowed_media(conn, sid, mid, other)
            assert exc.value.status_code == 404
        assert service.results(conn, sid, student)['questions'][0]['resources'][0]['media_ids'] == ['theory-a', 'theory-b']


def test_image_role_cannot_be_relinked_as_exam_content(engine, package):
    content = image_package(package)
    import_package(engine, content, ImageBytes())
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(catalog.question_images.insert().values(question_id=content.questions[0].id, image_id='theory-a', role='question', position=2))


def test_unknown_storage_bucket_rejected_before_any_network_request():
    def reject_network(request):
        raise AssertionError('An unknown image bucket must never trigger a request')
    config = Settings(SUPABASE_URL='https://test.supabase.co', SUPABASE_KEY='test-key', ASSESSMENT_STORAGE_BUCKET='approved-assessments')
    storage = Storage(config, httpx.MockTransport(reject_network))
    with pytest.raises(MediaError, match='not configured'):
        storage.read({'id': 'untrusted-image', 'object_key': 'approved/diagram.png', 'mime_type': 'image/png', 'role': 'question', 'bucket_id': 'other-bucket'})


@pytest.mark.parametrize('field,value', [('object_key', 'approved/replaced.png'), ('transcription', 'Replaced reviewed transcription')])
def test_image_metadata_is_immutable(engine, package, field, value):
    content = image_package(package)
    import_package(engine, content, ImageBytes())
    changed = content.model_dump()
    changed['media'][0][field] = value
    with pytest.raises(ValueError, match='Immutable'):
        import_package(engine, Package.model_validate(changed), ImageBytes())
    with engine.connect() as conn:
        stored = conn.execute(select(catalog.images).where(catalog.images.c.id == 'diagram-a')).mappings().one()
        assert stored[field] == getattr(content.media[0], field)


def test_changed_bytes_rejected_without_rewriting_existing_content(engine, package):
    content = image_package(package)
    original = png('white')
    import_package(engine, content, ImageBytes(original))
    with engine.connect() as conn:
        before = snapshot(conn, db.metadata.sorted_tables)
    with pytest.raises(ValueError, match='Immutable image bytes changed'):
        import_package(engine, content, ImageBytes(png('black')))
    with engine.connect() as conn:
        assert snapshot(conn, db.metadata.sorted_tables) == before


def test_legacy_unknown_image_checksum_is_frozen_on_verified_reimport(legacy_engine, package):
    image = {'id': 'legacy-diagram', 'object_key': 'approved/legacy-diagram.png', 'mime_type': 'image/png', 'role': 'question', 'transcription': None}
    with legacy_engine.begin() as conn:
        question = conn.execute(select(db.questions.c.content).where(db.questions.c.id == package.questions[0].id)).scalar_one()
        question['media_ids'] = [image['id']]
        conn.execute(db.questions.update().where(db.questions.c.id == question['id']).values(content=question))
        conn.execute(db.media.insert().values(id=image['id'], content=image))
    migrate(legacy_engine)
    with legacy_engine.connect() as conn:
        registered = conn.execute(select(catalog.images).where(catalog.images.c.id == image['id'])).mappings().one()
        assert registered['sha256'] is None
        assert registered['byte_size'] is None
        before = snapshot(conn, (db.questions, db.resources, db.media, db.papers))
    content = package.model_dump()
    content['media'] = [image]
    content['questions'][0]['media_ids'] = [image['id']]
    verified_package = Package.model_validate(content)
    verified_bytes = png('white')
    import_package(legacy_engine, verified_package, ImageBytes(verified_bytes))
    with legacy_engine.connect() as conn:
        assert snapshot(conn, (db.questions, db.resources, db.media, db.papers)) == before
        registered = conn.execute(select(catalog.images).where(catalog.images.c.id == image['id'])).mappings().one()
        assert registered['sha256'] == hashlib.sha256(verified_bytes).hexdigest()
        assert registered['byte_size'] == len(verified_bytes)
    with pytest.raises(ValueError, match='Immutable image bytes changed'):
        import_package(legacy_engine, verified_package, ImageBytes(png('black')))


def test_image_route_rejects_changed_registered_bytes(engine, student, package, monkeypatch):
    from app.routers import assessments
    content = image_package(package)
    import_package(engine, content, ImageBytes(png('white')))
    sid = service.start(engine, student, service.Start(paper_id=content.paper.id))['session_id']
    monkeypatch.setattr(db, 'engine', engine)
    monkeypatch.setattr(assessments, 'Storage', lambda: ImageBytes(png('white')))
    response = assessments.image(sid, 'diagram-a', student)
    assert response.body == png('white')
    assert response.headers['cache-control'] == 'private, no-store'
    monkeypatch.setattr(assessments, 'Storage', lambda: ImageBytes(png('black')))
    with pytest.raises(HTTPException) as exc:
        assessments.image(sid, 'diagram-a', student)
    assert exc.value.status_code == 503


def test_worker_does_not_send_changed_images_to_model(engine, student, package):
    content = image_package(package)
    import_package(engine, content, ImageBytes(png('white')))
    sid = service.start(engine, student, service.Start(paper_id=content.paper.id))['session_id']
    submission = service.save_answers(engine, sid, student, service.AnswerRequest(answers=[]), final=True)

    class VisionProvider:
        name = 'mock'
        model = 'catalog-test'
        vision = True

        def __init__(self):
            self.question_ids = []

        async def generate(self, evidence, images):
            self.question_ids.append(evidence['question']['id'])
            return reviewed_feedback(evidence), {}

    provider = VisionProvider()
    assert asyncio.run(process_one(engine, provider, ImageBytes(png('black')), session_id=sid))
    with engine.connect() as conn:
        result = service.results(conn, sid, student)
        assert result['score'] == submission['score']
        first = result['questions'][0]
        assert first['analysis']['status'] == 'reviewed_fallback'
        assert first['analysis']['fallback_reason'] == 'media_unavailable'
        assert first['question']['id'] not in provider.question_ids
        assert len(provider.question_ids) == 2


def test_question_family_metadata_cannot_change_for_existing_version(engine, package):
    content = translated(package, 'en')
    imported = Package.model_validate(content)
    import_package(engine, imported, NoMedia())
    content['questions'][0]['family_id'] = 'a-different-canonical-family'
    with pytest.raises(ValueError, match='Immutable'):
        import_package(engine, Package.model_validate(content), NoMedia())
    with engine.connect() as conn:
        assert conn.execute(select(catalog.questions.c.family_id).where(catalog.questions.c.id == imported.questions[0].id)).scalar_one() == imported.questions[0].family_id
        assert conn.execute(select(catalog.families.c.id).where(catalog.families.c.id == 'a-different-canonical-family')).first() is None


def test_question_cannot_be_shared_by_papers_with_different_languages(engine, package):
    changed = package.model_dump()
    changed['paper']['id'] = 'same-question-wrong-language'
    changed['paper']['content_language'] = 'si'
    with pytest.raises(ValueError, match='Immutable'):
        import_package(engine, Package.model_validate(changed), NoMedia())
    with engine.connect() as conn:
        assert conn.execute(select(db.papers.c.id).where(db.papers.c.id == changed['paper']['id'])).first() is None
        assert conn.execute(select(catalog.questions.c.language_id).where(catalog.questions.c.id == package.questions[0].id)).scalar_one() == 'en'
        assert conn.execute(select(catalog.subject_versions.c.id).where(catalog.subject_versions.c.language_id == 'si')).first() is None


def test_ambiguous_legacy_language_aborts_backfill_without_changing_history(legacy_engine, package):
    with legacy_engine.begin() as conn:
        paper = legacy_content(package)['paper']
        paper['id'] = 'ambiguous-legacy-language'
        paper['content_language'] = 'si'
        write_legacy_paper(conn, paper)
    with legacy_engine.connect() as conn:
        before = snapshot(conn, (db.questions, db.resources, db.options, db.keys, db.papers, db.composition))
    with pytest.raises(ValueError, match='Immutable'):
        migrate(legacy_engine)
    with legacy_engine.connect() as conn:
        assert snapshot(conn, (db.questions, db.resources, db.options, db.keys, db.papers, db.composition)) == before
        assert conn.execute(select(db.schema_versions.c.version).where(db.schema_versions.c.version == 3)).first() is None
        assert conn.execute(select(func.count()).select_from(catalog.questions)).scalar_one() == 0


def test_orphan_legacy_question_requires_explicit_language_before_migration(legacy_engine, package):
    orphan = legacy_content(package)['questions'][0]
    orphan['id'] = 'orphan-question-v1'
    with legacy_engine.begin() as conn:
        conn.execute(db.questions.insert().values(id=orphan['id'], concept_id=orphan['concept_id'], content=orphan))
    with pytest.raises(ValueError, match='without published paper membership'):
        migrate(legacy_engine)
    with legacy_engine.connect() as conn:
        assert conn.execute(select(db.questions.c.content).where(db.questions.c.id == orphan['id'])).scalar_one() == orphan
        assert conn.execute(select(db.schema_versions.c.version).where(db.schema_versions.c.version == 3)).first() is None
        assert conn.execute(select(func.count()).select_from(catalog.questions)).scalar_one() == 0


@pytest.mark.parametrize('target', ['question', 'theory'])
def test_explicit_language_must_match_paper(package, target):
    content = package.model_dump()
    if target == 'question':
        content['questions'][0]['language'] = 'si'
    else:
        content['resources'][0]['language'] = 'si'
    with pytest.raises(ValidationError, match='language'):
        Package.model_validate(content)
