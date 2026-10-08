"""
TESO — Pydantic Schemas for Multi-Subject Revision Engine & Question Bank
File: app/schemas/revision_schemas.py
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Subject Hierarchy Schemas
# ---------------------------------------------------------------------------

class SubjectBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=150)
    exam_level: str = Field("AL", description="'AL' or 'OL'")
    stream: Optional[str] = None
    icon_name: Optional[str] = None
    is_active: bool = True


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    exam_level: Optional[str] = None
    stream: Optional[str] = None
    icon_name: Optional[str] = None
    is_active: Optional[bool] = None


class SubjectResponse(SubjectBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubjectTopicBase(BaseModel):
    subject_id: uuid.UUID
    topic_number: float
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    syllabus_weight: float = 1.0
    order_index: int = 0
    is_active: bool = True


class SubjectTopicCreate(SubjectTopicBase):
    pass


class SubjectTopicUpdate(BaseModel):
    topic_number: Optional[float] = None
    name: Optional[str] = None
    description: Optional[str] = None
    syllabus_weight: Optional[float] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectTopicResponse(SubjectTopicBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubjectSubtopicBase(BaseModel):
    topic_id: uuid.UUID
    subtopic_code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    estimated_hours: float = 1.0
    order_index: int = 0
    is_active: bool = True


class SubjectSubtopicCreate(SubjectSubtopicBase):
    pass


class SubjectSubtopicUpdate(BaseModel):
    subtopic_code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    estimated_hours: Optional[float] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectSubtopicResponse(SubjectSubtopicBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Question Bank Schemas (Admin & Management)
# ---------------------------------------------------------------------------

class QuestionChoicePayload(BaseModel):
    index: int
    text: Optional[str] = None
    image_url: Optional[str] = None


class QuestionCreateRequest(BaseModel):
    subject_id: uuid.UUID
    topic_id: uuid.UUID
    subtopic_id: uuid.UUID
    exam_level: str = Field("AL", description="'AL' (5 choices) or 'OL' (4 choices)")

    question_text: str = Field(..., min_length=3)
    question_image_url: Optional[str] = None

    answer_1_text: Optional[str] = None
    answer_1_image_url: Optional[str] = None

    answer_2_text: Optional[str] = None
    answer_2_image_url: Optional[str] = None

    answer_3_text: Optional[str] = None
    answer_3_image_url: Optional[str] = None

    answer_4_text: Optional[str] = None
    answer_4_image_url: Optional[str] = None

    # Option 5 required for AL, omitted or null for OL
    answer_5_text: Optional[str] = None
    answer_5_image_url: Optional[str] = None

    correct_answer_number: int = Field(..., ge=1, le=5)
    additional_correct_answer_number: Optional[int] = Field(None, description="Optional secondary correct key (1-5), or -1 for bonus/all-correct")

    explanation_text: Optional[str] = None
    explanation_image_url: Optional[str] = None

    initial_difficulty: Optional[float] = Field(0.50, ge=0.0, le=1.0)
    time_limit_seconds: Optional[int] = Field(90, ge=10, le=600)


class QuestionUpdateRequest(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    subtopic_id: Optional[uuid.UUID] = None
    exam_level: Optional[str] = None

    question_text: Optional[str] = None
    question_image_url: Optional[str] = None

    answer_1_text: Optional[str] = None
    answer_1_image_url: Optional[str] = None

    answer_2_text: Optional[str] = None
    answer_2_image_url: Optional[str] = None

    answer_3_text: Optional[str] = None
    answer_3_image_url: Optional[str] = None

    answer_4_text: Optional[str] = None
    answer_4_image_url: Optional[str] = None

    answer_5_text: Optional[str] = None
    answer_5_image_url: Optional[str] = None

    correct_answer_number: Optional[int] = Field(None, ge=1, le=5)
    additional_correct_answer_number: Optional[int] = None

    explanation_text: Optional[str] = None
    explanation_image_url: Optional[str] = None

    difficulty_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    time_limit_seconds: Optional[int] = None
    is_active: Optional[bool] = None


class QuestionAdminResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    topic_id: uuid.UUID
    subtopic_id: uuid.UUID
    exam_level: str

    question_text: str
    question_image_url: Optional[str] = None

    answer_1_text: Optional[str] = None
    answer_1_image_url: Optional[str] = None

    answer_2_text: Optional[str] = None
    answer_2_image_url: Optional[str] = None

    answer_3_text: Optional[str] = None
    answer_3_image_url: Optional[str] = None

    answer_4_text: Optional[str] = None
    answer_4_image_url: Optional[str] = None

    answer_5_text: Optional[str] = None
    answer_5_image_url: Optional[str] = None

    correct_answer_number: int
    additional_correct_answer_number: Optional[int] = None

    explanation_text: Optional[str] = None
    explanation_image_url: Optional[str] = None

    difficulty_score: float
    elo_rating: float
    irt_difficulty_b: float
    total_attempts: int
    total_correct: int
    historical_accuracy: float

    time_limit_seconds: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuestionAnalyticsResponse(BaseModel):
    question_id: uuid.UUID
    subject_name: str
    topic_name: str
    subtopic_name: str
    total_attempts: int
    total_correct: int
    historical_accuracy: float
    difficulty_score: float
    elo_rating: float
    irt_difficulty_b: float
    difficulty_band: str  # "Easy", "Medium", "Hard", "Expert"


# ---------------------------------------------------------------------------
# Student Enrollment & Revision Flow Schemas
# ---------------------------------------------------------------------------

class StudentEnrollmentItem(BaseModel):
    subject_id: uuid.UUID
    subject_name: str
    subject_code: str
    exam_level: str
    stream: Optional[str] = None
    is_primary: bool


class StudentEnrollmentRequest(BaseModel):
    subject_ids: List[uuid.UUID]


class RevisionQueueSubtopicItem(BaseModel):
    subtopic_id: uuid.UUID
    subtopic_code: str
    subtopic_name: str
    topic_name: str
    subject_id: uuid.UUID
    subject_name: str
    memory_strength: float
    forgetting_risk: float
    mastery_probability: float
    stability_factor: float
    current_interval_days: int
    next_revision_due: Optional[datetime] = None
    is_overdue: bool
    priority_score: float


class RevisionQueueResponse(BaseModel):
    user_id: uuid.UUID
    subject_filter: Optional[str] = None
    total_due_count: int
    items: List[RevisionQueueSubtopicItem]


# ---------------------------------------------------------------------------
# Adaptive Quiz Session Schemas
# ---------------------------------------------------------------------------

class StudentChoice(BaseModel):
    index: int
    text: Optional[str] = None
    image_url: Optional[str] = None


class StudentQuizQuestion(BaseModel):
    id: uuid.UUID
    subtopic_id: uuid.UUID
    subtopic_name: str
    subtopic_code: Optional[str] = None
    topic_name: Optional[str] = None
    syllabus_sequence: Optional[str] = None
    subject_name: str
    exam_level: str
    question_text: str
    question_image_url: Optional[str] = None
    choices: List[StudentChoice]
    time_limit_seconds: int


class StartRevisionQuizRequest(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    subtopic_id: Optional[uuid.UUID] = None
    question_count: int = Field(10, ge=1, le=50)


class StartRevisionQuizResponse(BaseModel):
    session_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    subject_name: Optional[str] = None
    target_difficulty: float
    questions: List[StudentQuizQuestion]


class SingleAnswerSubmit(BaseModel):
    question_id: uuid.UUID
    selected_answer_number: Optional[int] = Field(None, ge=1, le=5)
    response_time_ms: int = Field(0, ge=0)
    confidence_rating: Optional[int] = Field(3, ge=1, le=5)


class SingleQuestionSubmitRequest(BaseModel):
    session_id: uuid.UUID
    question_id: uuid.UUID
    selected_answer_number: Optional[int] = Field(None, ge=1, le=5)
    response_time_ms: int = Field(0, ge=0)
    confidence_rating: Optional[int] = Field(3, ge=1, le=5)


class SingleQuestionSubmitResponse(BaseModel):
    question_id: uuid.UUID
    is_correct: bool
    selected_answer_number: Optional[int]
    correct_answer_number: int
    additional_correct_answer_number: Optional[int] = None
    explanation_text: Optional[str] = None
    explanation_image_url: Optional[str] = None
    old_difficulty: float
    new_difficulty: float
    elo_rating: float
    new_mastery_probability: float
    new_memory_strength: float
    earned_xp: int
    subtopic_name: str
    message: str


class SubmitRevisionQuizRequest(BaseModel):
    session_id: uuid.UUID
    answers: List[SingleAnswerSubmit]


class EvaluatedQuestionResult(BaseModel):
    question_id: uuid.UUID
    is_correct: bool
    selected_answer_number: Optional[int]
    correct_answer_number: int
    additional_correct_answer_number: Optional[int] = None
    explanation_text: Optional[str] = None
    explanation_image_url: Optional[str] = None
    old_difficulty: float
    new_difficulty: float


class SubmitRevisionQuizResponse(BaseModel):
    session_id: uuid.UUID
    total_questions: int
    correct_count: int
    score_percentage: float
    subtopic_mastery_updates: Dict[str, float]
    subtopic_memory_updates: Dict[str, float]
    results: List[EvaluatedQuestionResult]
    earned_xp: int
    message: str


class SecretAdminLoginRequest(BaseModel):
    email: str
    password: str
    secret_key: str

