"""Relational content catalog; immutable exam JSON remains the grading snapshot."""
import hashlib
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, Index, select
from app.assessment import db
from app.config import settings

languages = db.table('languages', db.ident(), Column('name', String, nullable=False, unique=True))
subject_versions = db.table('subject_versions', db.ident(), Column('subject_id', ForeignKey(db.subjects.c.id), nullable=False), Column('language_id', ForeignKey(languages.c.id), nullable=False), Column('version', Integer, nullable=False), Column('display_name', String, nullable=False), UniqueConstraint('subject_id', 'language_id', 'version'), UniqueConstraint('id', 'subject_id', 'language_id'), CheckConstraint('version > 0'))
topics = db.table('topics', db.ident(), Column('subject_id', ForeignKey(db.subjects.c.id), nullable=False), Column('name', String, nullable=False), ForeignKeyConstraint(['id'], [db.concepts.c.id]), UniqueConstraint('id', 'subject_id'))
families = db.table('question_families', db.ident(), Column('subject_id', ForeignKey(db.subjects.c.id), nullable=False), Column('topic_id', String, nullable=False), ForeignKeyConstraint(['topic_id', 'subject_id'], [topics.c.id, topics.c.subject_id]), UniqueConstraint('id', 'subject_id', 'topic_id'))
buckets = db.table('storage_buckets', db.ident(), Column('provider', String, nullable=False), Column('bucket_name', String, nullable=False), Column('is_private', Boolean, nullable=False), UniqueConstraint('provider', 'bucket_name'), CheckConstraint("provider = 'supabase'"), CheckConstraint('is_private'))
images = db.table('images', db.ident(), Column('bucket_id', ForeignKey(buckets.c.id), nullable=False), Column('object_key', String, nullable=False), Column('mime_type', String, nullable=False), Column('role', String, nullable=False), Column('transcription', String), Column('sha256', String(64)), Column('byte_size', Integer), ForeignKeyConstraint(['id'], [db.media.c.id]), UniqueConstraint('bucket_id', 'object_key'), UniqueConstraint('id', 'role'), CheckConstraint("role IN ('question', 'option', 'solution', 'theory')"), CheckConstraint("mime_type IN ('image/png', 'image/jpeg', 'image/webp')"), CheckConstraint('byte_size IS NULL OR byte_size > 0'))
theories = db.table('theories', db.ident(), Column('topic_id', ForeignKey(topics.c.id), nullable=False), Column('language_id', ForeignKey(languages.c.id), nullable=False), Column('version', Integer, nullable=False), Column('title', String, nullable=False), Column('theory_text', String, nullable=False), Column('url', String), ForeignKeyConstraint(['id'], [db.resources.c.id]), UniqueConstraint('id', 'topic_id', 'language_id'), CheckConstraint('version > 0'))
choices = db.table('answer_choices', db.ident(), Column('question_id', ForeignKey(db.questions.c.id), nullable=False), Column('option_id', String, nullable=False), Column('answer_text', String, nullable=False), ForeignKeyConstraint(['question_id', 'option_id'], [db.options.c.question_id, db.options.c.id]), UniqueConstraint('question_id', 'option_id'), UniqueConstraint('id', 'question_id'))
questions = db.table('question_details', db.ident(), Column('family_id', String, nullable=False), Column('subject_version_id', String, nullable=False), Column('subject_id', ForeignKey(db.subjects.c.id), nullable=False), Column('topic_id', String, nullable=False), Column('language_id', ForeignKey(languages.c.id), nullable=False), Column('version', Integer, nullable=False), Column('question_text', String, nullable=False), Column('marks', Float, nullable=False), Column('primary_theory_id', String, nullable=False), Column('correct_answer_id', String, nullable=False), Column('is_development', Boolean, nullable=False), ForeignKeyConstraint(['id'], [db.questions.c.id]), ForeignKeyConstraint(['family_id', 'subject_id', 'topic_id'], [families.c.id, families.c.subject_id, families.c.topic_id]), ForeignKeyConstraint(['subject_version_id', 'subject_id', 'language_id'], [subject_versions.c.id, subject_versions.c.subject_id, subject_versions.c.language_id]), ForeignKeyConstraint(['primary_theory_id', 'topic_id', 'language_id'], [theories.c.id, theories.c.topic_id, theories.c.language_id]), ForeignKeyConstraint(['correct_answer_id', 'id'], [choices.c.id, choices.c.question_id]), UniqueConstraint('family_id', 'language_id', 'version'), UniqueConstraint('id', 'topic_id', 'language_id'), CheckConstraint('version > 0'), CheckConstraint('marks > 0'))
question_theories = db.table('question_theories', Column('question_id', String, primary_key=True), Column('theory_id', String, primary_key=True), Column('topic_id', String, nullable=False), Column('language_id', String, nullable=False), Column('position', Integer, nullable=False), ForeignKeyConstraint(['question_id', 'topic_id', 'language_id'], [questions.c.id, questions.c.topic_id, questions.c.language_id]), ForeignKeyConstraint(['theory_id', 'topic_id', 'language_id'], [theories.c.id, theories.c.topic_id, theories.c.language_id]), UniqueConstraint('question_id', 'position'), CheckConstraint('position >= 0'))
question_images = db.table('question_images', Column('question_id', ForeignKey(questions.c.id), primary_key=True), Column('image_id', String, primary_key=True), Column('role', String, nullable=False), Column('position', Integer, nullable=False), ForeignKeyConstraint(['image_id', 'role'], [images.c.id, images.c.role]), UniqueConstraint('question_id', 'role', 'position'), CheckConstraint("role IN ('question', 'solution')"), CheckConstraint('position >= 0'))
choice_images = db.table('answer_choice_images', Column('answer_id', ForeignKey(choices.c.id), primary_key=True), Column('image_id', String, primary_key=True), Column('role', String, nullable=False), Column('position', Integer, nullable=False), ForeignKeyConstraint(['image_id', 'role'], [images.c.id, images.c.role]), UniqueConstraint('answer_id', 'position'), CheckConstraint("role = 'option'"), CheckConstraint('position >= 0'))
theory_images = db.table('theory_images', Column('theory_id', ForeignKey(theories.c.id), primary_key=True), Column('image_id', String, primary_key=True), Column('role', String, nullable=False), Column('position', Integer, nullable=False), ForeignKeyConstraint(['image_id', 'role'], [images.c.id, images.c.role]), UniqueConstraint('theory_id', 'position'), CheckConstraint("role = 'theory'"), CheckConstraint('position >= 0'))
TABLES = (languages, subject_versions, topics, families, buckets, images, theories, choices, questions, question_theories, question_images, choice_images, theory_images)
Index('teso_catalog_subject_topic_language', questions.c.subject_id, questions.c.topic_id, questions.c.language_id, questions.c.is_development)
Index('teso_theory_topic_language', theories.c.topic_id, theories.c.language_id)
Index('teso_catalog_family', questions.c.family_id)
TRAINING_INDEX = Index('teso_student_history_order', db.sessions.c.student_id, db.sessions.c.started_at, db.sessions.c.id)

def answer_id(qid, option_id):
    # Deterministic globally unique IDs without delimiter ambiguity.
    return hashlib.sha256((qid + '\0' + option_id).encode()).hexdigest()

def immutable(conn, table, values):
    predicates = [table.c[c.name] == values[c.name] for c in table.primary_key]
    stored = conn.execute(select(table).where(*predicates)).mappings().first()
    if stored and dict(stored) != values:
        raise ValueError(f'Immutable catalog metadata changed in {table.name}; publish a new version ID')
    if not stored: conn.execute(table.insert().values(**values))

def seed(conn):
    for code, name in [('en', 'English'), ('si', 'Sinhala'), ('ta', 'Tamil')]:
        immutable(conn, languages, dict(id=code, name=name))
    immutable(conn, buckets, dict(id=settings.ASSESSMENT_STORAGE_BUCKET, provider='supabase', bucket_name=settings.ASSESSMENT_STORAGE_BUCKET, is_private=True))

def project(conn, package, media_bytes=None):
    """Write a validated package's normalized rows in the caller's transaction."""
    seed(conn)
    lang = package.paper.content_language
    subject_map = {s.id: s for s in package.subjects}
    unit_map = {u.id: u for u in package.units}
    concept_map = {c.id: c for c in package.concepts}
    for c in package.concepts:
        immutable(conn, topics, dict(id=c.id, subject_id=unit_map[c.unit_id].subject_id, name=c.name))
    used_subjects = {unit_map[concept_map[q.concept_id].unit_id].subject_id for q in package.questions}
    for subject_id in used_subjects:
        sv = f'{subject_id}--{lang}--v{package.paper.subject_version}'
        immutable(conn, subject_versions, dict(id=sv, subject_id=subject_id, language_id=lang, version=package.paper.subject_version, display_name=subject_map[subject_id].name))
    for m in package.media:
        raw = (media_bytes or {}).get(m.id)
        existing = conn.execute(select(images).where(images.c.id == m.id)).mappings().first()
        # Unknown legacy provenance is enriched only from explicitly verified bytes.
        if existing and raw and not existing['sha256']:
            conn.execute(images.update().where(images.c.id == m.id).values(sha256=hashlib.sha256(raw).hexdigest(), byte_size=len(raw)))
            existing = {**existing, 'sha256': hashlib.sha256(raw).hexdigest(), 'byte_size': len(raw)}
        immutable(conn, images, dict(id=m.id, bucket_id=m.bucket_id or settings.ASSESSMENT_STORAGE_BUCKET, object_key=m.object_key, mime_type=m.mime_type, role=m.role, transcription=m.transcription, sha256=existing['sha256'] if existing else hashlib.sha256(raw).hexdigest() if raw else None, byte_size=existing['byte_size'] if existing else len(raw) if raw else None))
        if existing and raw and existing['sha256'] and hashlib.sha256(raw).hexdigest() != existing['sha256']:
            raise ValueError('Immutable image bytes changed; publish a new object and image ID')
    for r in package.resources:
        immutable(conn, theories, dict(id=r.id, topic_id=r.concept_id, language_id=r.language or lang, version=r.version, title=r.title, theory_text=r.theory, url=r.url))
        for i, mid in enumerate(r.media_ids): immutable(conn, theory_images, dict(theory_id=r.id, image_id=mid, role='theory', position=i))
    for q in package.questions:
        topic = q.concept_id
        subject_id = unit_map[concept_map[topic].unit_id].subject_id
        family_id = q.family_id or q.id
        immutable(conn, families, dict(id=family_id, subject_id=subject_id, topic_id=topic))
        for o in q.options:
            immutable(conn, choices, dict(id=answer_id(q.id, o.id), question_id=q.id, option_id=o.id, answer_text=o.text))
            for i, mid in enumerate(o.media_ids): immutable(conn, choice_images, dict(answer_id=answer_id(q.id, o.id), image_id=mid, role='option', position=i))
        immutable(conn, questions, dict(id=q.id, family_id=family_id, subject_version_id=f'{subject_id}--{lang}--v{package.paper.subject_version}', subject_id=subject_id, topic_id=topic, language_id=q.language or lang, version=q.version, question_text=q.text, marks=q.marks, primary_theory_id=q.resource_ids[0], correct_answer_id=answer_id(q.id, q.correct_option_id), is_development=package.paper.is_development))
        for i, rid in enumerate(q.resource_ids): immutable(conn, question_theories, dict(question_id=q.id, theory_id=rid, topic_id=topic, language_id=lang, position=i))
        for role, mids in [('question', q.media_ids), ('solution', q.solution_media_ids)]:
            for i, mid in enumerate(mids): immutable(conn, question_images, dict(question_id=q.id, image_id=mid, role=role, position=i))

def backfill(conn):
    """Infer legacy language only from unambiguous paper membership."""
    from app.assessment.content import Package
    subjects = [dict(r) for r in conn.execute(select(db.subjects)).mappings()]
    units = [dict(r) for r in conn.execute(select(db.units)).mappings()]
    concepts = [dict(r) for r in conn.execute(select(db.concepts)).mappings()]
    qs = {q['id']: q for q in conn.execute(select(db.questions.c.content)).scalars()}
    rs = {r['id']: r for r in conn.execute(select(db.resources.c.content)).scalars()}
    ms = {m['id']: m for m in conn.execute(select(db.media.c.content)).scalars()}
    seed(conn)
    covered = set()
    for paper in conn.execute(select(db.papers.c.content)).scalars():
        covered.update(paper['question_ids'])
        questions = [qs[qid] for qid in paper['question_ids']]
        rids = {rid for q in questions for rid in q['resource_ids']}
        mids = {mid for q in questions for mid in q['media_ids'] + q['solution_media_ids'] + [mid for o in q['options'] for mid in o['media_ids']]}
        mids |= {mid for rid in rids for mid in rs[rid].get('media_ids', [])}
        package = Package.model_validate(dict(subjects=subjects, units=units, concepts=concepts, questions=questions, resources=[rs[rid] for rid in rids], media=[ms[mid] for mid in mids], paper=paper))
        project(conn, package)
    if covered != set(qs):
        raise ValueError('Legacy questions without published paper membership need explicit language metadata before migration')

def ddl():
    from sqlalchemy import create_mock_engine
    statements = []
    engine = create_mock_engine('postgresql+psycopg://', lambda sql, *a, **kw: statements.append(str(sql.compile(dialect=engine.dialect)).strip() + ';'))
    db.metadata.create_all(engine, tables=TABLES)
    TRAINING_INDEX.create(engine)
    for table in TABLES:
        statements += [f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY;', f'REVOKE ALL ON "{table.name}" FROM PUBLIC;']
    formatted = ['\n'.join(line.rstrip() for line in statement.splitlines()) for statement in statements]
    return '-- Migration 003: normalized multilingual content and private image references.\n-- Apply with CLI migrate to backfill existing immutable content and record version 3.\n\n' + '\n\n'.join(formatted) + '\n'
