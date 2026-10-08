"""
TESO — Multi-Subject Adaptive Revision API Routes
File: app/routes/multi_subject_revision.py
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.base_models import User
from app.models.revision_models import (
    Subject, SubjectTopic, SubjectSubtopic, StudentSubjectEnrollment, QuestionBank, ExamLevel,
    RevisionHistorySession
)
from pydantic import BaseModel
from sqlalchemy import desc
from app.schemas.revision_schemas import (
    StudentEnrollmentItem, StudentEnrollmentRequest,
    RevisionQueueResponse, RevisionQueueSubtopicItem,
    StartRevisionQuizRequest, StartRevisionQuizResponse,
    StudentQuizQuestion, StudentChoice,
    SubmitRevisionQuizRequest, SubmitRevisionQuizResponse,
    SingleQuestionSubmitRequest, SingleQuestionSubmitResponse
)
from app.services.multi_subject_revision_service import (
    sync_user_enrolled_subjects,
    get_student_revision_queue,
    select_adaptive_questions,
    process_revision_quiz_submission,
    process_single_question_submission
)

router = APIRouter(prefix="/api/revision", tags=["multi-subject-revision"])


# ---------------------------------------------------------------------------
# 1. Enrolled Subjects
# ---------------------------------------------------------------------------

@router.get("/enrolled-subjects", response_model=List[StudentEnrollmentItem], summary="Get student's enrolled subjects")
def get_enrolled_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subjects = sync_user_enrolled_subjects(current_user.id, db)
    return [
        {
            "subject_id": s.id,
            "subject_name": s.name,
            "subject_code": s.code,
            "exam_level": s.exam_level,
            "stream": s.stream,
            "is_primary": True,
        }
        for s in subjects
    ]


@router.post("/enroll", response_model=List[StudentEnrollmentItem], summary="Enroll in subjects")
def enroll_subjects(
    payload: StudentEnrollmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Clear previous enrollments
    db.query(StudentSubjectEnrollment).filter(
        StudentSubjectEnrollment.user_id == current_user.id
    ).delete()

    for sid in payload.subject_ids:
        subj = db.query(Subject).filter(Subject.id == sid, Subject.is_active == True).first()
        if subj:
            db.add(StudentSubjectEnrollment(
                user_id=current_user.id,
                subject_id=sid,
                is_primary=True,
            ))
    db.commit()

    return get_enrolled_subjects(db=db, current_user=current_user)


# ---------------------------------------------------------------------------
# 2. Spaced Repetition Queue
# ---------------------------------------------------------------------------

@router.get("/queue", response_model=RevisionQueueResponse, summary="Get spaced repetition revision queue")
def get_revision_queue(
    subject_id: Optional[uuid.UUID] = None,
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items_data = get_student_revision_queue(
        user_id=current_user.id,
        subject_id_filter=subject_id,
        db=db,
        limit=limit
    )

    overdue_count = sum(1 for it in items_data if it["is_overdue"])
    subject_name_filter = None
    if subject_id:
        s = db.query(Subject).filter(Subject.id == subject_id).first()
        if s:
            subject_name_filter = s.name

    return {
        "user_id": current_user.id,
        "subject_filter": subject_name_filter,
        "total_due_count": overdue_count,
        "items": items_data,
    }


# ---------------------------------------------------------------------------
# 3. Adaptive Quiz Runner
# ---------------------------------------------------------------------------

@router.post("/quiz/start", response_model=StartRevisionQuizResponse, summary="Start adaptive revision quiz")
def start_revision_quiz(
    payload: StartRevisionQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    questions, target_diff = select_adaptive_questions(
        user_id=current_user.id,
        subject_id=payload.subject_id,
        subtopic_id=payload.subtopic_id,
        question_count=payload.question_count,
        db=db
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions available for the selected subject/subtopic."
        )

    session_id = uuid.uuid4()
    formatted_questions: List[StudentQuizQuestion] = []

    for q in questions:
        subtopic = db.query(SubjectSubtopic).filter(SubjectSubtopic.id == q.subtopic_id).first()
        topic = db.query(SubjectTopic).filter(SubjectTopic.id == q.topic_id).first()
        subject = db.query(Subject).filter(Subject.id == q.subject_id).first()

        choices = [
            StudentChoice(index=1, text=q.answer_1_text, image_url=q.answer_1_image_url),
            StudentChoice(index=2, text=q.answer_2_text, image_url=q.answer_2_image_url),
            StudentChoice(index=3, text=q.answer_3_text, image_url=q.answer_3_image_url),
            StudentChoice(index=4, text=q.answer_4_text, image_url=q.answer_4_image_url),
        ]

        # Choice 5 included only for AL or if populated
        if q.exam_level == ExamLevel.AL.value or q.answer_5_text or q.answer_5_image_url:
            choices.append(StudentChoice(index=5, text=q.answer_5_text, image_url=q.answer_5_image_url))

        sub_code = subtopic.subtopic_code if subtopic else ""
        t_name = topic.name if topic else ""
        t_num = f"Unit {topic.topic_number}: " if topic else ""
        seq = f"{t_num}{t_name} > {sub_code} {subtopic.name}" if subtopic else "General"

        formatted_questions.append(StudentQuizQuestion(
            id=q.id,
            subtopic_id=q.subtopic_id,
            subtopic_name=subtopic.name if subtopic else "General",
            subtopic_code=sub_code,
            topic_name=t_name,
            syllabus_sequence=seq,
            subject_name=subject.name if subject else "General",
            exam_level=q.exam_level,
            question_text=q.question_text,
            question_image_url=q.question_image_url,
            choices=choices,
            time_limit_seconds=q.time_limit_seconds,
        ))

    subject_name = None
    if payload.subject_id:
        s = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if s:
            subject_name = s.name

    return StartRevisionQuizResponse(
        session_id=session_id,
        subject_id=payload.subject_id,
        subject_name=subject_name,
        target_difficulty=target_diff,
        questions=formatted_questions,
    )


@router.post("/quiz/submit-single", response_model=SingleQuestionSubmitResponse, summary="Submit single question with immediate results")
def submit_single_question(
    payload: SingleQuestionSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return process_single_question_submission(
            user_id=current_user.id,
            session_id=payload.session_id,
            question_id=payload.question_id,
            selected_answer_number=payload.selected_answer_number,
            response_time_ms=payload.response_time_ms,
            confidence_rating=payload.confidence_rating or 3,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/quiz/submit", response_model=SubmitRevisionQuizResponse, summary="Submit quiz with Duolingo recalibration")
def submit_revision_quiz(
    payload: SubmitRevisionQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = process_revision_quiz_submission(
        user_id=current_user.id,
        session_id=payload.session_id,
        answers=payload.answers,
        db=db
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


class RecordSessionHistoryRequest(BaseModel):
    session_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    subtopic_id: Optional[uuid.UUID] = None
    session_title: Optional[str] = None
    score_percentage: float
    correct_count: int
    total_questions: int
    earned_xp: int = 0


@router.post("/history/record", summary="Record completed revision session history")
def record_revision_history(
    payload: RecordSessionHistoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history_entry = RevisionHistorySession(
        user_id=current_user.id,
        subject_id=payload.subject_id,
        subtopic_id=payload.subtopic_id,
        session_title=payload.session_title,
        score_percentage=payload.score_percentage,
        correct_count=payload.correct_count,
        total_questions=payload.total_questions,
        earned_xp=payload.earned_xp,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return {"status": "success", "id": str(history_entry.id)}


@router.get("/history", summary="Get student's revision session history")
def get_revision_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = (
        db.query(RevisionHistorySession)
        .filter(RevisionHistorySession.user_id == current_user.id)
        .order_by(desc(RevisionHistorySession.completed_at))
        .limit(limit)
        .all()
    )

    results = []
    for item in entries:
        subj = db.query(Subject).filter(Subject.id == item.subject_id).first() if item.subject_id else None
        st = db.query(SubjectSubtopic).filter(SubjectSubtopic.id == item.subtopic_id).first() if item.subtopic_id else None
        results.append({
            "id": str(item.id),
            "session_title": item.session_title or (st.name if st else (subj.name if subj else "Revision Session")),
            "subject_name": subj.name if subj else "General",
            "subtopic_name": st.name if st else "Pool Practice",
            "score_percentage": item.score_percentage,
            "correct_count": item.correct_count,
            "total_questions": item.total_questions,
            "earned_xp": item.earned_xp,
            "completed_at": item.completed_at,
        })
    return results
