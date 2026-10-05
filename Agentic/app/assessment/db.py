"""The assessment schema is owned here; migrations are explicit CLI operations."""
from sqlalchemy import (MetaData, Table, Column, String, Integer, Float, Boolean,
                        JSON, ForeignKey, ForeignKeyConstraint, UniqueConstraint,
                        CheckConstraint, Index, create_engine, event)
from app.config import settings

metadata = MetaData()
def table(name, *cols):
    return Table('teso_' + name, metadata, *cols)
def ident():
    return Column('id', String, primary_key=True)

students = table('students', ident(), Column('is_development', Boolean, nullable=False))
subjects = table('subjects', ident(), Column('name', String, nullable=False))
units = table('units', ident(), Column('subject_id', ForeignKey(subjects.c.id), nullable=False), Column('name', String, nullable=False))
concepts = table('concepts', ident(), Column('unit_id', ForeignKey(units.c.id), nullable=False), Column('name', String, nullable=False))
resources = table('resources', ident(), Column('concept_id', ForeignKey(concepts.c.id), nullable=False), Column('content', JSON, nullable=False))
media = table('media', ident(), Column('content', JSON, nullable=False))
questions = table('questions', ident(), Column('concept_id', ForeignKey(concepts.c.id), nullable=False), Column('content', JSON, nullable=False))
options = table('options', Column('question_id', ForeignKey(questions.c.id), primary_key=True), Column('id', String, primary_key=True), Column('content', JSON, nullable=False))
keys = table('answer_keys', Column('question_id', ForeignKey(questions.c.id), primary_key=True), Column('option_id', String, nullable=False), ForeignKeyConstraint(['question_id', 'option_id'], [options.c.question_id, options.c.id]))
papers = table('papers', ident(), Column('content', JSON, nullable=False))
composition = table('paper_questions', Column('paper_id', ForeignKey(papers.c.id), primary_key=True), Column('question_id', ForeignKey(questions.c.id), primary_key=True), Column('position', Integer, nullable=False), UniqueConstraint('paper_id', 'position'))
sessions = table('sessions', ident(), Column('student_id', ForeignKey(students.c.id), nullable=False, index=True), Column('paper_id', ForeignKey(papers.c.id), nullable=False), Column('status', String, nullable=False), Column('language', String, nullable=False), Column('activity_type', String, nullable=False), Column('is_development', Boolean, nullable=False), Column('started_at', Float, nullable=False), Column('submitted_at', Float), Column('score', JSON))
presented = table('presented', Column('session_id', ForeignKey(sessions.c.id), primary_key=True), Column('question_id', ForeignKey(questions.c.id), primary_key=True), Column('position', Integer, nullable=False))
answers = table('answers', Column('session_id', String, primary_key=True), Column('question_id', String, primary_key=True), Column('selected_option', String), Column('answered_at', Float), Column('submitted_at', Float), Column('duration_ms', Integer), Column('hint_exposed', Boolean), Column('solution_exposed', Boolean), Column('correct', Boolean), Column('marks', Float), Column('is_final', Boolean, nullable=False), ForeignKeyConstraint(['session_id', 'question_id'], [presented.c.session_id, presented.c.question_id]), ForeignKeyConstraint(['question_id', 'selected_option'], [options.c.question_id, options.c.id]), CheckConstraint('duration_ms IS NULL OR duration_ms >= 0'))
jobs = table('jobs', ident(), Column('session_id', ForeignKey(sessions.c.id), nullable=False, unique=True), Column('state', String, nullable=False, index=True), Column('attempts', Integer, nullable=False), Column('available_at', Float, nullable=False), Column('lease_until', Float), Column('claim_token', String), Column('error_code', String))
analyses = table('analyses', Column('session_id', String, primary_key=True), Column('question_id', String, primary_key=True), Column('analysis_version', Integer, primary_key=True), Column('content', JSON, nullable=False), ForeignKeyConstraint(['session_id', 'question_id'], [presented.c.session_id, presented.c.question_id]))
plans = table('session_plans', Column('session_id', ForeignKey(sessions.c.id), primary_key=True), Column('source_session_id', ForeignKey(sessions.c.id), nullable=False, unique=True), Column('content', JSON, nullable=False))
learning_records = table('learning_records', Column('session_id', ForeignKey(sessions.c.id), primary_key=True), Column('content', JSON, nullable=False))
schema_versions = table('schema_versions', Column('version', Integer, primary_key=True))
Index('teso_first_response', sessions.c.student_id, sessions.c.submitted_at)
Index('teso_answer_question', answers.c.question_id, answers.c.is_final)

def make_engine(url):
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql+psycopg://', 1)
    elif url.startswith('postgresql://'):
        url = url.replace('postgresql://', 'postgresql+psycopg://', 1)
    engine = create_engine(url, pool_pre_ping=True, connect_args={'check_same_thread': False, 'timeout': 30} if url.startswith('sqlite') else {'connect_timeout': 10})
    if engine.dialect.name == 'sqlite':
        @event.listens_for(engine, 'connect')
        def sqlite_setup(conn, _):
            conn.execute('PRAGMA foreign_keys=ON')
            conn.execute('PRAGMA journal_mode=WAL')
    return engine

engine = make_engine(settings.DATABASE_URL)

def begin(db):
    """Serialize SQLite writes; PostgreSQL uses per-session row locks."""
    conn = db.connect()
    if db.dialect.name == 'sqlite':
        conn.exec_driver_sql('BEGIN IMMEDIATE')
    else:
        conn.begin()
    return conn
