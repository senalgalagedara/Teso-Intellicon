import time
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from app.security import verify_engine_key
from app.engine.schemas import (
    NextQuestionRequest, NextQuestionResponse,
    ProcessAttemptRequest, ProcessAttemptResponse,
    DueReviewItem,
    StudentProgressResponse,
    PeerDiagnosticResponse,
    ItemStatsResponse, ItemStatItem,
    ZScoresResponse, StudentZScoreItem,
    JobRunResponse
)
from app.engine.services.practice import get_next_practice_question
from app.engine.services.attempts import process_single_attempt
from app.engine.services.reviews import (
    get_due_reviews, get_student_progress, get_peer_diagnostics
)
from app.engine.services.cohort import get_course_item_stats, get_course_zscores
from app.engine.jobs.jobs import run_named_job

logger = logging.getLogger("revision_engine.api")

router = APIRouter(prefix="/v1", tags=["Revision Engine (v1)"], dependencies=[Depends(verify_engine_key)])

@router.post("/practice/next", response_model=NextQuestionResponse)
async def next_practice_question(request: NextQuestionRequest):
    """
    Selects the next adaptive MCQ for practice considering weak topics, due FSRS cards, and ~70% success fit.
    """
    t0 = time.time()
    try:
        result = await get_next_practice_question(
            student_id=request.student_id,
            course_id=request.course_id
        )
        duration = round((time.time() - t0) * 1000, 2)
        logger.info(f"next_practice_question served in {duration}ms: {result}")
        return NextQuestionResponse(
            question_id=result["question_id"],
            reason=result["reason"]
        )
    except Exception as e:
        logger.error(f"Error selecting next practice question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/attempts/process", response_model=ProcessAttemptResponse)
async def process_attempt_endpoint(request: ProcessAttemptRequest):
    """
    Processes a submitted attempt idempotently in a single transaction with row locking.
    """
    t0 = time.time()
    try:
        diag = await process_single_attempt(attempt_id=request.attempt_id)
        duration = round((time.time() - t0) * 1000, 2)
        logger.info(f"process_attempt for {request.attempt_id} finished in {duration}ms: {diag}")
        return ProcessAttemptResponse(
            label=diag["label"],
            p_mastery=diag["p_mastery"],
            next_due_at=diag.get("next_due_at")
        )
    except Exception as e:
        logger.error(f"Error processing attempt {request.attempt_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reviews/due", response_model=List[DueReviewItem])
async def reviews_due_endpoint(
    student_id: str = Query(..., description="Student UUID"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Returns items scheduled for spaced-repetition review ordered by earliest due date.
    """
    try:
        items = await get_due_reviews(student_id=student_id, limit=limit)
        return [DueReviewItem(**item) for item in items]
    except Exception as e:
        logger.error(f"Error loading due reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students/{student_id}/progress", response_model=StudentProgressResponse)
async def student_progress_endpoint(
    student_id: str,
    course_id: Optional[str] = Query(None)
):
    """
    Retrieves student ability (theta), topic mastery breakdown, and weak topic list.
    """
    try:
        progress = await get_student_progress(student_id=student_id, course_id=course_id)
        return StudentProgressResponse(**progress)
    except Exception as e:
        logger.error(f"Error loading student progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students/{student_id}/peer-diagnostic", response_model=PeerDiagnosticResponse)
async def peer_diagnostic_endpoint(
    student_id: str,
    session_id: Optional[str] = Query(None)
):
    """
    Categorizes student misses into peer-easy traps (facility > 0.85) vs cohort-hard (facility < 0.20).
    """
    try:
        diagnostics = await get_peer_diagnostics(student_id=student_id, session_id=session_id)
        return PeerDiagnosticResponse(**diagnostics)
    except Exception as e:
        logger.error(f"Error loading peer diagnostics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/courses/{course_id}/item-stats", response_model=ItemStatsResponse)
async def course_item_stats_endpoint(course_id: str):
    """
    Returns educator analytics: facility, discrimination, and diagnostic flags per question.
    """
    try:
        stats = await get_course_item_stats(course_id=course_id)
        return ItemStatsResponse(
            course_id=course_id,
            items=[ItemStatItem(**s) for s in stats]
        )
    except Exception as e:
        logger.error(f"Error computing item stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/courses/{course_id}/zscores", response_model=ZScoresResponse)
async def course_zscores_endpoint(
    course_id: str,
    linked_course_ids: Optional[str] = Query(None, description="Comma-separated linked course UUIDs")
):
    """
    Computes cross-subject Z-scores and Monte Carlo projections for linked courses with consent.
    """
    try:
        linked_list = [c.strip() for c in linked_course_ids.split(",") if c.strip()] if linked_course_ids else None
        zscores = await get_course_zscores(course_id=course_id, linked_course_ids=linked_list)
        return ZScoresResponse(
            course_id=course_id,
            students=[StudentZScoreItem(**z) for z in zscores]
        )
    except Exception as e:
        logger.error(f"Error computing Z-scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/jobs/{name}", response_model=JobRunResponse)
async def run_job_endpoint(name: str):
    """
    Triggers an administrative revision engine background maintenance job.
    """
    try:
        res = await run_named_job(name)
        return JobRunResponse(
            job=name,
            status=res.get("status", "completed"),
            message="Job executed successfully",
            details=res
        )
    except Exception as e:
        logger.error(f"Error running job {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
