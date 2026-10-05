from typing import Literal, Annotated
from urllib.parse import urlsplit
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from app.assessment import db

Id = Annotated[str, Field(pattern=r'^[a-zA-Z0-9_-]+$', min_length=1, max_length=100)]

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Named(Strict):
    id: Id
    name: str = Field(min_length=1)

class Unit(Named):
    subject_id: Id

class Concept(Named):
    unit_id: Id

class Resource(Strict):
    id: Id
    version: int = Field(ge=1)
    concept_id: Id
    title: str
    theory: str = Field(min_length=1)
    url: str | None = None

    @model_validator(mode='after')
    def safe_url(self):
        if self.url and (urlsplit(self.url).scheme != 'https' or not urlsplit(self.url).hostname or urlsplit(self.url).username):
            raise ValueError('Resources must use approved HTTPS URLs')
        return self

class Media(Strict):
    id: Id
    object_key: str
    mime_type: Literal['image/png', 'image/jpeg', 'image/webp']
    role: Literal['question', 'option', 'solution']
    transcription: str | None = None

    @model_validator(mode='after')
    def key_safe(self):
        parts = self.object_key.split('/')
        if not self.object_key.startswith('approved/') or any(p in ('', '.', '..') for p in parts) or any(x in self.object_key for x in ('\\', ':', '%', '?', '#')):
            raise ValueError('Media must use an approved/ bucket key, never a URL or local path')
        return self

class Option(Strict):
    id: Id
    text: str = ''
    media_ids: list[Id] = Field(default_factory=list)

    @model_validator(mode='after')
    def has_content(self):
        if not self.text.strip() and not self.media_ids:
            raise ValueError('Text or media required')
        return self

class NumericResult(Strict):
    value: float = Field(allow_inf_nan=False)
    unit: str

class Question(Strict):
    id: Id  # Immutable version identifier, e.g. force-v1
    version: int = Field(ge=1)
    text: str = ''
    media_ids: list[Id] = Field(default_factory=list)
    options: list[Option] = Field(min_length=2)
    correct_option_id: Id
    marks: float = Field(gt=0, allow_inf_nan=False)
    concept_id: Id
    resource_ids: list[Id] = Field(min_length=1)
    base_explanation: str = Field(min_length=1)
    solution_media_ids: list[Id] = Field(default_factory=list)
    numeric_result: NumericResult | None = None

    @model_validator(mode='after')
    def valid_options(self):
        ids = [o.id for o in self.options]
        if len(set(ids)) != len(ids) or ids.count(self.correct_option_id) != 1:
            raise ValueError('Exactly one approved correct option and unique option IDs required')
        if not self.text.strip() and not self.media_ids:
            raise ValueError('Question text or media required')
        return self

class Paper(Strict):
    id: Id
    version: int = Field(ge=1)
    title: str
    status: Literal['published']
    review_status: Literal['reviewed', 'development_fixture']
    is_development: bool
    question_ids: list[Id] = Field(min_length=1, max_length=200)
    subject_id: Id | None = None
    content_language: Literal['en', 'si', 'ta'] = 'en'
    marking_rule: Literal['single_answer_no_penalty']

class Package(Strict):
    subjects: list[Named]
    units: list[Unit]
    concepts: list[Concept]
    resources: list[Resource]
    media: list[Media] = Field(default_factory=list)
    questions: list[Question]
    paper: Paper

    @model_validator(mode='after')
    def references(self):
        maps = {}
        for name in ('subjects', 'units', 'concepts', 'resources', 'media', 'questions'):
            values = getattr(self, name)
            maps[name] = {v.id: v for v in values}
            if len(maps[name]) != len(values):
                raise ValueError(f'Duplicate {name} IDs')
        def require(name, key):
            if key not in maps[name]:
                raise ValueError(f'Unknown {name} reference: {key}')
        for u in self.units: require('subjects', u.subject_id)
        for c in self.concepts: require('units', c.unit_id)
        for r in self.resources: require('concepts', r.concept_id)
        for q in self.questions:
            require('concepts', q.concept_id)
            for rid in q.resource_ids:
                require('resources', rid)
                if maps['resources'][rid].concept_id != q.concept_id:
                    raise ValueError('Theory concept mismatch')
            groups = [('question', q.media_ids), ('solution', q.solution_media_ids)] + [('option', o.media_ids) for o in q.options]
            for role, ids in groups:
                for mid in ids:
                    require('media', mid)
                    if maps['media'][mid].role != role:
                        raise ValueError('Media role mismatch')
        object_roles = {}
        for m in self.media:
            if m.object_key in object_roles and object_roles[m.object_key] != m.role:
                raise ValueError('A private object cannot be shared between solution and exam media roles')
            object_roles[m.object_key] = m.role
        if len(set(self.paper.question_ids)) != len(self.paper.question_ids) or set(self.paper.question_ids) != set(maps['questions']):
            raise ValueError('Paper membership must contain each package question exactly once')
        subject_ids = {maps['units'][maps['concepts'][q.concept_id].unit_id].subject_id for q in self.questions}
        if len(subject_ids) != 1 or (self.paper.subject_id and self.paper.subject_id not in subject_ids):
            raise ValueError('A paper must belong to one matching subject')
        if self.paper.is_development != (self.paper.review_status == 'development_fixture'):
            raise ValueError('Development fixtures cannot claim expert review')
        return self

def import_package(engine, package: Package, storage):
    # Check all bytes before any database mutation; no missing-media placeholders.
    for m in package.media:
        storage.read(m.model_dump())
    with engine.begin() as conn:
        existing_media = list(conn.execute(select(db.media.c.content)).scalars())
        roles = {m['object_key']: m['role'] for m in existing_media}
        for m in package.media:
            if m.object_key in roles and roles[m.object_key] != m.role:
                raise ValueError('A private object cannot be shared across exam/solution media roles')
        def immutable(table, values, key='id'):
            existing = conn.execute(select(table).where(table.c[key] == values[key])).mappings().first()
            if existing:
                if dict(existing) != values:
                    raise ValueError(f'Immutable content changed: {values[key]}; publish a new version ID')
            else:
                conn.execute(table.insert().values(**values))
        for s in package.subjects: immutable(db.subjects, s.model_dump())
        for u in package.units: immutable(db.units, u.model_dump())
        for c in package.concepts: immutable(db.concepts, c.model_dump())
        for r in package.resources: immutable(db.resources, {'id': r.id, 'concept_id': r.concept_id, 'content': r.model_dump()})
        for m in package.media: immutable(db.media, {'id': m.id, 'content': m.model_dump()})
        for q in package.questions:
            exists = conn.execute(select(db.questions.c.id).where(db.questions.c.id == q.id)).first()
            immutable(db.questions, {'id': q.id, 'concept_id': q.concept_id, 'content': q.model_dump()})
            if not exists:
                conn.execute(db.options.insert(), [{'question_id': q.id, 'id': o.id, 'content': o.model_dump()} for o in q.options])
                conn.execute(db.keys.insert().values(question_id=q.id, option_id=q.correct_option_id))
        exists = conn.execute(select(db.papers.c.id).where(db.papers.c.id == package.paper.id)).first()
        paper_content = package.paper.model_dump()
        if exists:
            stored = conn.execute(select(db.papers.c.content).where(db.papers.c.id == package.paper.id)).scalar_one()
            if Paper.model_validate(stored).model_dump() == paper_content: paper_content = stored
        immutable(db.papers, {'id': package.paper.id, 'content': paper_content})
        if not exists:
            conn.execute(db.composition.insert(), [{'paper_id': package.paper.id, 'question_id': qid, 'position': i} for i, qid in enumerate(package.paper.question_ids)])
