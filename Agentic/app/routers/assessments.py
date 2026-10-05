from fastapi import APIRouter, Depends, HTTPException, Response
import hashlib
from sqlalchemy import select
from app.assessment import db, service, learning
from app.assessment.auth import authenticate, Identity
from app.assessment.storage import Storage, MediaError
from app.assessment import api_schemas as schemas

router = APIRouter(prefix='/api/assessments', tags=['Student assessments'], dependencies=[])

@router.get('/papers', response_model=schemas.PaperList)
def papers(identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn: return {'papers': service.paper_list(conn, identity)}

@router.get('/sessions', response_model=schemas.SessionList)
def sessions(identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn:
        rows = conn.execute(select(db.sessions.c.id, db.sessions.c.status, db.sessions.c.paper_id, db.sessions.c.started_at).where(db.sessions.c.student_id == identity.student_id).order_by(db.sessions.c.started_at.desc()).limit(50)).mappings()
        return {'sessions': [dict(r) for r in rows]}

@router.post('/sessions', response_model=schemas.Started)
def start(request: service.Start, identity: Identity = Depends(authenticate)):
    return service.start(db.engine, identity, request)

@router.get('/sessions/{sid}', response_model=schemas.Exam)
def exam(sid: str, identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn: return service.exam(conn, sid, identity)

@router.put('/sessions/{sid}/draft', response_model=schemas.DraftSaved)
def draft(sid: str, request: service.AnswerRequest, identity: Identity = Depends(authenticate)):
    return service.save_answers(db.engine, sid, identity, request)

@router.post('/sessions/{sid}/submit', response_model=schemas.Submission)
def submit(sid: str, request: service.AnswerRequest, identity: Identity = Depends(authenticate)):
    return service.save_answers(db.engine, sid, identity, request, final=True)

@router.get('/sessions/{sid}/results', response_model=schemas.Results)
def results(sid: str, identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn: return service.results(conn, sid, identity)

@router.get('/sessions/{sid}/job', response_model=schemas.Job)
def job(sid: str, identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn:
        service.owned(conn, sid, identity)
        j = conn.execute(select(db.jobs).where(db.jobs.c.session_id == sid)).mappings().first()
        if not j: raise HTTPException(404, 'Analysis job not created yet')
        return {'job_id': j['id'], 'state': j['state'], 'attempts': j['attempts'], 'error_code': j['error_code']}

@router.get('/sessions/{sid}/media/{mid}')
def image(sid: str, mid: str, identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn:
        m = service.allowed_media(conn, sid, mid, identity)
        checksum = conn.execute(select(db.catalog.images.c.sha256).where(db.catalog.images.c.id == mid)).scalar_one_or_none()
    try:
        raw = Storage().read(m)
        if checksum and hashlib.sha256(raw).hexdigest() != checksum: raise MediaError('Approved image bytes changed')
    except MediaError: raise HTTPException(503, 'Approved image currently unavailable') from None
    return Response(raw, media_type=m['mime_type'], headers={'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'})

@router.get('/history', response_model=schemas.History)
def history(identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn: return learning.history(conn, identity)

@router.get('/sessions/{sid}/recommendation', response_model=schemas.Plan)
def recommendation(sid: str, identity: Identity = Depends(authenticate)):
    with db.engine.connect() as conn: return learning.recommend(conn, sid, identity)

@router.post('/sessions/{sid}/next', response_model=schemas.Started)
def next_paper(sid: str, request: schemas.NextRequest, identity: Identity = Depends(authenticate)):
    return learning.start_next(db.engine, sid, identity, request.question_count)
