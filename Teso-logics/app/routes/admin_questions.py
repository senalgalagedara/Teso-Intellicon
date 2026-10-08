"""
TESO — Admin Question Bank & Curriculum Management API Routes
File: app/routes/admin_questions.py
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.routes.auth import get_current_user
from app.models.base_models import User
from app.models.revision_models import (
    Subject, SubjectTopic, SubjectSubtopic, QuestionBank, ExamLevel
)
from app.schemas.revision_schemas import (
    SubjectCreate, SubjectUpdate, SubjectResponse,
    SubjectTopicCreate, SubjectTopicUpdate, SubjectTopicResponse,
    SubjectSubtopicCreate, SubjectSubtopicUpdate, SubjectSubtopicResponse,
    QuestionCreateRequest, QuestionUpdateRequest, QuestionAdminResponse,
    QuestionAnalyticsResponse, SecretAdminLoginRequest
)

router = APIRouter(prefix="/api/admin", tags=["admin-question-bank"])


# ---------------------------------------------------------------------------
# 0. Secret Admin Login
# ---------------------------------------------------------------------------

@router.post("/secret-login", summary="Authenticate with master admin credentials")
def secret_admin_login(
    payload: SecretAdminLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticates separate secret admin portal with credentials from env.example.
    """
    if (
        payload.email == settings.ADMIN_EMAIL
        and payload.password == settings.ADMIN_PASSWORD
        and payload.secret_key == settings.ADMIN_SECRET_KEY
    ):
        # Auto-provision or fetch admin account
        admin_user = db.query(User).filter(User.email == payload.email).first()
        if not admin_user:
            admin_user = User(
                id=uuid.uuid4(),
                email=payload.email,
                password_hash="secret_admin_managed",
                full_name="TESO Master Administrator",
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        token = create_access_token(data={"sub": str(admin_user.id), "role": "ADMIN", "email": payload.email})
        return {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "role": "ADMIN",
            "email": payload.email,
            "user_id": str(admin_user.id),
        }

    raise HTTPException(status_code=401, detail="Invalid admin credentials or secret master key.")


# ---------------------------------------------------------------------------
# 0.1 Syllabus Order Suggestion (Auto-Mapping)
# ---------------------------------------------------------------------------

@router.get("/suggest-order", summary="Auto-map next syllabus topic number or subtopic code")
def suggest_syllabus_order(
    subject_id: Optional[uuid.UUID] = None,
    topic_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if topic_id:
        topic = db.query(SubjectTopic).filter(SubjectTopic.id == topic_id).first()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found.")
        count = db.query(SubjectSubtopic).filter(SubjectSubtopic.topic_id == topic_id).count()
        base_num = int(topic.topic_number) if topic.topic_number.is_integer() else topic.topic_number
        suggested_code = f"{base_num}.{count + 1}"
        return {
            "type": "subtopic",
            "topic_id": str(topic.id),
            "topic_number": topic.topic_number,
            "topic_name": topic.name,
            "suggested_subtopic_code": suggested_code,
            "suggested_order_index": count + 1,
        }
    elif subject_id:
        count = db.query(SubjectTopic).filter(SubjectTopic.subject_id == subject_id).count()
        return {
            "type": "topic",
            "subject_id": str(subject_id),
            "suggested_topic_number": float(count + 1),
            "suggested_order_index": count + 1,
        }
    return {}


# ---------------------------------------------------------------------------
# 1. Subjects Endpoints
# ---------------------------------------------------------------------------

@router.get("/subjects", response_model=List[SubjectResponse], summary="List all subjects")
def list_subjects(
    exam_level: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Subject)
    if exam_level:
        query = query.filter(Subject.exam_level == exam_level.upper())
    if is_active is not None:
        query = query.filter(Subject.is_active == is_active)
    return query.order_by(Subject.name).all()


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Subject).filter(Subject.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject with code '{payload.code}' already exists.")

    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


# ---------------------------------------------------------------------------
# 2. Topics Endpoints
# ---------------------------------------------------------------------------

@router.get("/topics", response_model=List[SubjectTopicResponse])
def list_topics(
    subject_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SubjectTopic)
        .filter(SubjectTopic.subject_id == subject_id, SubjectTopic.is_active == True)
        .order_by(SubjectTopic.order_index, SubjectTopic.topic_number)
        .all()
    )


@router.post("/topics", response_model=SubjectTopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: SubjectTopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = SubjectTopic(**payload.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


# ---------------------------------------------------------------------------
# 3. Subtopics Endpoints
# ---------------------------------------------------------------------------

@router.get("/subtopics", response_model=List[SubjectSubtopicResponse])
def list_subtopics(
    topic_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SubjectSubtopic)
        .filter(SubjectSubtopic.topic_id == topic_id, SubjectSubtopic.is_active == True)
        .order_by(SubjectSubtopic.order_index, SubjectSubtopic.subtopic_code)
        .all()
    )


@router.post("/subtopics", response_model=SubjectSubtopicResponse, status_code=status.HTTP_201_CREATED)
def create_subtopic(
    payload: SubjectSubtopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtopic = SubjectSubtopic(**payload.model_dump())
    db.add(subtopic)
    db.commit()
    db.refresh(subtopic)
    return subtopic


# ---------------------------------------------------------------------------
# 4. Question Bank CRUD & Analytics
# ---------------------------------------------------------------------------

@router.get("/questions", response_model=List[QuestionAdminResponse])
def list_questions(
    subject_id: Optional[uuid.UUID] = None,
    topic_id: Optional[uuid.UUID] = None,
    subtopic_id: Optional[uuid.UUID] = None,
    exam_level: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(QuestionBank).filter(QuestionBank.is_active == True)
    if subject_id:
        query = query.filter(QuestionBank.subject_id == subject_id)
    if topic_id:
        query = query.filter(QuestionBank.topic_id == topic_id)
    if subtopic_id:
        query = query.filter(QuestionBank.subtopic_id == subtopic_id)
    if exam_level:
        query = query.filter(QuestionBank.exam_level == exam_level.upper())
    if search:
        query = query.filter(QuestionBank.question_text.ilike(f"%{search}%"))

    return query.order_by(desc(QuestionBank.created_at)).offset(skip).limit(limit).all()


@router.post("/questions", response_model=QuestionAdminResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validation for A/L vs O/L choices
    level = payload.exam_level.upper()
    if level == ExamLevel.AL.value:
        # 5 choices expected for AL
        if not payload.answer_5_text and not payload.answer_5_image_url:
            raise HTTPException(
                status_code=400,
                detail="A/L questions require 5 answer options. Answer 5 text or image must be provided."
            )
    elif level == ExamLevel.OL.value:
        # Choices 1..4 max for OL
        if payload.correct_answer_number > 4:
            raise HTTPException(
                status_code=400,
                detail="O/L questions only have 4 options. Correct answer number cannot exceed 4."
            )

    init_diff = payload.initial_difficulty if payload.initial_difficulty is not None else 0.50
    # Map initial difficulty to Elo: 0.1 (Easy) -> 1300, 0.5 (Med) -> 1500, 0.9 (Hard) -> 1700
    init_elo = 1500.0 + (init_diff - 0.5) * 400.0
    init_b = (init_elo - 1500.0) / 200.0

    question = QuestionBank(
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        subtopic_id=payload.subtopic_id,
        exam_level=level,
        question_text=payload.question_text,
        question_image_url=payload.question_image_url,
        answer_1_text=payload.answer_1_text,
        answer_1_image_url=payload.answer_1_image_url,
        answer_2_text=payload.answer_2_text,
        answer_2_image_url=payload.answer_2_image_url,
        answer_3_text=payload.answer_3_text,
        answer_3_image_url=payload.answer_3_image_url,
        answer_4_text=payload.answer_4_text,
        answer_4_image_url=payload.answer_4_image_url,
        answer_5_text=payload.answer_5_text,
        answer_5_image_url=payload.answer_5_image_url,
        correct_answer_number=payload.correct_answer_number,
        additional_correct_answer_number=payload.additional_correct_answer_number,
        explanation_text=payload.explanation_text,
        explanation_image_url=payload.explanation_image_url,
        difficulty_score=init_diff,
        elo_rating=init_elo,
        irt_difficulty_b=init_b,
        total_attempts=0,
        total_correct=0,
        historical_accuracy=0.50,
        time_limit_seconds=payload.time_limit_seconds or 90,
        created_by=current_user.id,
        is_active=True,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/questions/{question_id}", response_model=QuestionAdminResponse)
def get_question(
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    return question


@router.put("/questions/{question_id}", response_model=QuestionAdminResponse)
def update_question(
    question_id: uuid.UUID,
    payload: QuestionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(question, field, val)

    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Soft delete
    question.is_active = False
    db.commit()
    return None


@router.get("/questions/{question_id}/analytics", response_model=QuestionAnalyticsResponse)
def get_question_analytics(
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    subject = db.query(Subject).filter(Subject.id == question.subject_id).first()
    topic = db.query(SubjectTopic).filter(SubjectTopic.id == question.topic_id).first()
    subtopic = db.query(SubjectSubtopic).filter(SubjectSubtopic.id == question.subtopic_id).first()

    diff = question.difficulty_score
    if diff < 0.35:
        band = "Easy"
    elif diff < 0.65:
        band = "Medium"
    elif diff < 0.85:
        band = "Hard"
    else:
        band = "Expert"

    return {
        "question_id": question.id,
        "subject_name": subject.name if subject else "Unknown",
        "topic_name": topic.name if topic else "Unknown",
        "subtopic_name": subtopic.name if subtopic else "Unknown",
        "total_attempts": question.total_attempts,
        "total_correct": question.total_correct,
        "historical_accuracy": question.historical_accuracy,
        "difficulty_score": question.difficulty_score,
        "elo_rating": question.elo_rating,
        "irt_difficulty_b": question.irt_difficulty_b,
        "difficulty_band": band,
    }
