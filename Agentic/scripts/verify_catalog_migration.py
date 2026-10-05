"""Apply the catalog migration and verify preserved records without logging data."""
import json
import sys
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.assessment import db
from app.assessment.cli import migrate

def snapshot(conn, table):
    query = select(table)
    if table is db.sessions: query = query.where(db.sessions.c.status == 'submitted')
    if table is db.answers: query = query.where(db.answers.c.is_final.is_(True))
    return {tuple(row[c.name] for c in table.primary_key): dict(row) for row in conn.execute(query).mappings()}

def run():
    engine = db.migration_engine()
    tables = (db.subjects, db.units, db.concepts, db.resources, db.media, db.questions, db.options, db.keys, db.papers, db.composition, db.sessions, db.answers, db.learning_records)
    try:
        with engine.connect() as conn:
            before = {t: snapshot(conn, t) for t in tables}
        migrate(engine)
        with engine.connect() as conn:
            after = {t: snapshot(conn, t) for t in tables}
            preserved = all(after[t].get(key) == record for t, records in before.items() for key, record in records.items())
            counts = {t.name: conn.execute(select(func.count()).select_from(t)).scalar_one() for t in db.catalog.TABLES}
        print(json.dumps({'migration': 3, 'existing_content_and_saved_results_preserved': preserved, 'catalog_counts': counts}, indent=2))
        if not preserved: raise SystemExit(1)
    finally:
        engine.dispose()

if __name__ == '__main__':
    try: run()
    except (SQLAlchemyError, OSError, ValueError) as exc:
        print(f'Migration verification failed ({type(exc).__name__}); no connection credentials or row contents logged.')
        raise SystemExit(1) from None
