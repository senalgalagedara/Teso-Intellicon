import argparse
import asyncio
import json
from pathlib import Path
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
import httpx
from sqlalchemy import select, text, create_mock_engine
from app.assessment import db
from app.assessment.content import Package, import_package
from app.assessment.storage import Storage
from app.assessment.provider import get_provider, ProviderFailure
from app.assessment.worker import process_one

def migrate(engine):
    # Initial additive migration, matching migrations/001_assessments.sql.
    # No auto migration on API startup; no changes to existing application tables.
    with engine.begin() as conn:
        if conn.dialect.name == 'postgresql': conn.execute(text('SELECT pg_advisory_xact_lock(74637601)'))
        db.metadata.create_all(conn)
        if conn.dialect.name == 'postgresql':
            for table in db.metadata.sorted_tables:
                conn.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))
                conn.execute(text(f'REVOKE ALL ON "{table.name}" FROM PUBLIC'))
        if not conn.execute(select(db.schema_versions.c.version).where(db.schema_versions.c.version == 1)).first():
            conn.execute(db.schema_versions.insert().values(version=1))

def ddl():
    statements = []
    engine = create_mock_engine('postgresql+psycopg://', lambda sql, *args, **kw: statements.append(str(sql.compile(dialect=engine.dialect)).strip() + ';'))
    db.metadata.create_all(engine)
    for table in db.metadata.sorted_tables:
        statements += [f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY;', f'REVOKE ALL ON "{table.name}" FROM PUBLIC;']
    statements.append('INSERT INTO teso_schema_versions (version) VALUES (1) ON CONFLICT DO NOTHING;')
    return '-- Initial additive assessment schema. Run through CLI migrate, once per database.\n' + '\n\n'.join(statements) + '\n'

async def smoke(path):
    package = Package.model_validate_json(Path(path).read_text(encoding='utf-8'))
    q = package.questions[0].model_dump()
    evidence = {'question': q, 'selected_option': q['correct_option_id'], 'resources': [r.model_dump() for r in package.resources if r.id in q['resource_ids']], 'allowed_concept_ids': [q['concept_id']], 'allowed_resource_ids': q['resource_ids'], 'language': 'en', 'media_transcriptions': []}
    provider = get_provider()
    try:
        feedback, usage = await provider.generate(evidence, [])
        print(json.dumps({'provider': provider.name, 'model': provider.model, 'live': provider.name != 'mock', 'validated': True, 'usage': usage}))
    except ProviderFailure as exc:
        print(json.dumps({'provider': provider.name, 'live': False, 'validated': False, 'error_code': exc.code}))
        raise SystemExit(1)

def main():
    parser = argparse.ArgumentParser(description='Teso assessment developer tools')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('migrate')
    sub.add_parser('ddl')
    imp = sub.add_parser('import-content'); imp.add_argument('path')
    live = sub.add_parser('smoke'); live.add_argument('path', nargs='?', default='fixtures/physics-development.json')
    sub.add_parser('work-once')
    args = parser.parse_args()
    if args.command == 'migrate': migrate(db.engine); print('Assessment migration 001 applied (additive).')
    elif args.command == 'ddl': print(ddl())
    elif args.command == 'import-content':
        p = Package.model_validate_json(Path(args.path).read_text(encoding='utf-8'))
        import_package(db.engine, p, Storage()); print(f'Imported immutable paper {p.paper.id}.')
    elif args.command == 'smoke': asyncio.run(smoke(args.path))
    elif args.command == 'work-once': print('Processed a job.' if asyncio.run(process_one()) else 'No eligible jobs.')

if __name__ == '__main__':
    try:
        main()
    except ValidationError as exc:
        print(json.dumps({'error': 'content_validation_failed', 'fields': [{'location': e['loc'], 'message': e['msg']} for e in exc.errors(include_input=False)]}))
        raise SystemExit(1) from None
    except (SQLAlchemyError, httpx.HTTPError, OSError) as exc:
        print(f'Operation failed ({type(exc).__name__}); check server configuration and connectivity.')
        raise SystemExit(1) from None
    except ValueError as exc:
        print(f'Configuration/content validation failed: {exc}')
        raise SystemExit(1) from None
