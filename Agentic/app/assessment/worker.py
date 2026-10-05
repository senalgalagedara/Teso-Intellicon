"""Durable lease-based worker. Per-question writes retain progress across restarts."""
import asyncio
import base64
import hashlib
import time
import uuid
from sqlalchemy import select, or_, and_
from app.config import settings
from app.assessment import db
from app.assessment.provider import (get_provider, ProviderFailure, reviewed_feedback,
                                     validate_feedback, PROMPT_VERSION)
from app.assessment.storage import Storage, MediaError
from app.assessment.service import question_rows

def claim(engine, session_id=None):
    now = time.time()
    with db.begin(engine) as conn:
        try:
            eligible = or_(and_(db.jobs.c.state == 'queued', db.jobs.c.available_at <= now), and_(db.jobs.c.state == 'processing', db.jobs.c.lease_until < now))
            q = select(db.jobs).where(eligible)
            if session_id: q = q.where(db.jobs.c.session_id == session_id)
            q = q.order_by(db.jobs.c.available_at).limit(1)
            if conn.dialect.name == 'postgresql': q = q.with_for_update(skip_locked=True)
            job = conn.execute(q).mappings().first()
            if not job:
                conn.commit()
                return None
            token = str(uuid.uuid4())
            conn.execute(db.jobs.update().where(db.jobs.c.id == job['id']).values(state='processing', claim_token=token, lease_until=now + settings.JOB_LEASE_SECONDS, attempts=job['attempts'] + 1))
            conn.commit()
            return {**job, 'claim_token': token, 'attempts': job['attempts'] + 1}
        except BaseException:
            conn.rollback()
            raise

def renew(conn, job):
    row = conn.execute(select(db.jobs).where(db.jobs.c.id == job['id']).with_for_update()).mappings().one()
    if row['claim_token'] != job['claim_token'] or row['state'] != 'processing' or row['lease_until'] < time.time():
        raise ProviderFailure('lost_job_lease')
    conn.execute(db.jobs.update().where(db.jobs.c.id == job['id']).values(lease_until=time.time() + settings.JOB_LEASE_SECONDS))

async def process_one(engine=db.engine, provider=None, storage=None, *, session_id=None):
    provider = provider or get_provider()
    storage = storage or Storage()
    job = claim(engine, session_id=session_id)
    if not job: return False
    try:
        await process_claimed(engine, job, provider, storage)
    except ProviderFailure as exc:
        if exc.code != 'lost_job_lease':
            with engine.begin() as conn:
                conn.execute(db.jobs.update().where(db.jobs.c.id == job['id'], db.jobs.c.claim_token == job['claim_token']).values(state='failed', lease_until=None, error_code=exc.code))
    except Exception:
        # No raw exceptions are persisted or logged; grade remains readable.
        with engine.begin() as conn:
            conn.execute(db.jobs.update().where(db.jobs.c.id == job['id'], db.jobs.c.claim_token == job['claim_token']).values(state='failed', lease_until=None, error_code='worker_internal_error'))
        raise
    return True

async def process_claimed(engine, job, provider, storage):
    sid = job['session_id']
    with engine.connect() as conn:
        s = conn.execute(select(db.sessions).where(db.sessions.c.id == sid)).mappings().one()
        qs = question_rows(conn, sid)
        answer_map = {a['question_id']: a['selected_option'] for a in conn.execute(select(db.answers).where(db.answers.c.session_id == sid)).mappings()}
    for q in qs:
        with engine.begin() as conn:
            renew(conn, job)
            if conn.execute(select(db.analyses.c.question_id).where(db.analyses.c.session_id == sid, db.analyses.c.question_id == q['id'])).first(): continue
            resources = [conn.execute(select(db.resources.c.content).where(db.resources.c.id == rid)).scalar_one() for rid in q['resource_ids']]
            mids = list(dict.fromkeys(q['media_ids'] + q['solution_media_ids'] + [mid for o in q['options'] for mid in o['media_ids']] + [mid for r in resources for mid in r.get('media_ids', [])]))
            records = [conn.execute(select(db.media.c.content).where(db.media.c.id == mid)).scalar_one() for mid in mids]
            checksums = dict(conn.execute(select(db.catalog.images.c.id, db.catalog.images.c.sha256).where(db.catalog.images.c.id.in_(mids))).all())
        evidence = {'question': q, 'selected_option': answer_map[q['id']], 'resources': resources, 'allowed_concept_ids': [q['concept_id']], 'allowed_resource_ids': q['resource_ids'], 'language': s['language'], 'media_transcriptions': [{'id': m['id'], 'role': m['role'], 'text': m['transcription']} for m in records]}
        images, usage, reason = [], {}, None
        try:
            if not provider.vision and any(not m['transcription'] for m in records):
                raise ProviderFailure('vision_unavailable_without_reviewed_transcription')
            if provider.vision:
                for m in records:
                    with engine.begin() as conn: renew(conn, job)
                    raw = await asyncio.wait_for(asyncio.to_thread(storage.read, m), timeout=30)
                    if checksums.get(m['id']) and hashlib.sha256(raw).hexdigest() != checksums[m['id']]:
                        raise MediaError('Approved image bytes changed')
                    images.extend([{'type': 'text', 'text': f"Approved {m['role']} image {m['id']}"}, {'type': 'image_url', 'image_url': {'url': f"data:{m['mime_type']};base64,{base64.b64encode(raw).decode()}", 'detail': 'high'}}])
            # Whole-question timeout also bounds injected providers and storage overhead.
            feedback, usage = await asyncio.wait_for(provider.generate(evidence, images), timeout=settings.AI_REQUEST_TIMEOUT_SECONDS + 1)
            validate_feedback(feedback, evidence)
            status = 'mock' if provider.name == 'mock' else 'ai_generated'
        except (ProviderFailure, MediaError, asyncio.TimeoutError) as exc:
            transient = isinstance(exc, asyncio.TimeoutError) or (isinstance(exc, ProviderFailure) and exc.transient)
            if transient and job['attempts'] < settings.AI_MAX_RETRIES:
                with engine.begin() as conn:
                    renew(conn, job)
                    conn.execute(db.jobs.update().where(db.jobs.c.id == job['id']).values(state='queued', available_at=time.time() + min(60, 2 ** job['attempts']), lease_until=None, error_code=getattr(exc, 'code', 'provider_timeout')))
                return
            reason = getattr(exc, 'code', 'media_unavailable' if isinstance(exc, MediaError) else 'provider_timeout')
            feedback = reviewed_feedback(evidence)
            status = 'reviewed_fallback'
        except Exception:
            feedback, status, reason = reviewed_feedback(evidence), 'reviewed_fallback', 'invalid_model_response'
        content = {'feedback': feedback.model_dump(), 'status': status, 'fallback_reason': reason,
            'provider': provider.name, 'model': provider.model, 'prompt_version': PROMPT_VERSION,
            'question_version': q['version'], 'resource_versions': {r['id']: r['version'] for r in resources},
            'analysis_version': 1, 'generated_at': time.time(), 'usage': usage, 'language': s['language'],
            'explanation_language': 'reviewed_content' if status in ('mock', 'reviewed_fallback') else s['language']}
        with engine.begin() as conn:
            renew(conn, job)
            conn.execute(db.analyses.insert().values(session_id=sid, question_id=q['id'], analysis_version=1, content=content))
    with engine.begin() as conn:
        renew(conn, job)
        statuses = [r['status'] for r in conn.execute(select(db.analyses.c.content).where(db.analyses.c.session_id == sid)).scalars()]
        conn.execute(db.jobs.update().where(db.jobs.c.id == job['id']).values(state='partial' if 'reviewed_fallback' in statuses else 'completed', lease_until=None, error_code=None))

async def run():
    if settings.JOB_LEASE_SECONDS <= settings.AI_REQUEST_TIMEOUT_SECONDS + 60:
        raise ValueError('JOB_LEASE_SECONDS must exceed request timeout plus 60 seconds')
    provider = get_provider()
    print(f'Teso analysis worker running: {provider.name} / {provider.model}', flush=True)
    while True:
        if not await process_one(provider=provider): await asyncio.sleep(2)

if __name__ == '__main__':
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    except Exception:
        print('Worker stopped after an infrastructure/configuration error. Restart after fixing configuration; expired jobs remain recoverable.')
        raise SystemExit(1) from None
