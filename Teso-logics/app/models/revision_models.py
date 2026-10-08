"""
TESO Multi-Subject Adaptive Revision Engine — Relational Models
File: app/models/revision_models.py
"""

import uuid
import enum
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Float,
    ForeignKey, Text, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class ExamLevel(str, enum.Enum):
    AL = "AL"  # G.C.E. Advanced Level (5 MCQ choices)
    OL = "OL"  # G.C.E. Ordinary Level (4 MCQ choices)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    exam_level = Column(String(10), nullable=False, default=ExamLevel.AL.value)
    stream = Column(String(100), nullable=True)  # e.g., 'Physical Science', 'Biological Science'
    icon_name = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SubjectTopic(Base):
    __tablename__ = "subject_topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    topic_number = Column(Float, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    syllabus_weight = Column(Float, default=1.0)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_subject_topics_subject_order", "subject_id", "order_index"),
    )


class SubjectSubtopic(Base):
    __tablename__ = "subject_subtopics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("subject_topics.id", ondelete="CASCADE"), nullable=False)
    subtopic_code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estimated_hours = Column(Float, default=1.0)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_subtopics_topic_order", "topic_id", "order_index"),
    )


class StudentSubjectEnrollment(Base):
    __tablename__ = "student_subject_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    is_primary = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("user_id", "subject_id", name="uq_user_subject_enrollment"),
        Index("ix_enrollments_user", "user_id"),
    )


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("subject_topics.id", ondelete="RESTRICT"), nullable=False)
    subtopic_id = Column(UUID(as_uuid=True), ForeignKey("subject_subtopics.id", ondelete="RESTRICT"), nullable=False)
    exam_level = Column(String(10), nullable=False, default=ExamLevel.AL.value)

    # Question Prompt
    question_text = Column(Text, nullable=False)
    question_image_url = Column(String(1024), nullable=True)

    # Choices (1 to 5)
    answer_1_text = Column(Text, nullable=True)
    answer_1_image_url = Column(String(1024), nullable=True)

    answer_2_text = Column(Text, nullable=True)
    answer_2_image_url = Column(String(1024), nullable=True)

    answer_3_text = Column(Text, nullable=True)
    answer_3_image_url = Column(String(1024), nullable=True)

    answer_4_text = Column(Text, nullable=True)
    answer_4_image_url = Column(String(1024), nullable=True)

    # 5th choice: Mandatory for AL, Null for OL
    answer_5_text = Column(Text, nullable=True)
    answer_5_image_url = Column(String(1024), nullable=True)

    # Correct Keys (1-indexed: 1, 2, 3, 4, 5; additional can be -1 for bonus/all-correct)
    correct_answer_number = Column(Integer, nullable=False)
    additional_correct_answer_number = Column(Integer, nullable=True)

    explanation_text = Column(Text, nullable=True)
    explanation_image_url = Column(String(1024), nullable=True)

    # Dynamic Difficulty & Empirical Metrics (Duolingo / Elo / IRT)
    difficulty_score = Column(Float, default=0.50, nullable=False)      # 0.00 (easy) - 1.00 (hard)
    elo_rating = Column(Float, default=1500.0, nullable=False)           # Dynamic Elo rating
    irt_difficulty_b = Column(Float, default=0.0, nullable=False)        # IRT parameter b (-3 to +3)
    irt_discrimination_a = Column(Float, default=1.0, nullable=False)    # IRT discrimination parameter a
    total_attempts = Column(Integer, default=0, nullable=False)
    total_correct = Column(Integer, default=0, nullable=False)
    historical_accuracy = Column(Float, default=0.50, nullable=False)

    time_limit_seconds = Column(Integer, default=90, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("correct_answer_number BETWEEN 1 AND 5", name="chk_correct_answer_range"),
        CheckConstraint("difficulty_score BETWEEN 0.0 AND 1.0", name="chk_difficulty_score_range"),
        Index("ix_qb_subject_level", "subject_id", "exam_level"),
        Index("ix_qb_subtopic_diff", "subtopic_id", "difficulty_score"),
        Index("ix_qb_active_diff", "is_active", "difficulty_score"),
    )


class UserSubtopicState(Base):
    __tablename__ = "user_subtopic_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    subtopic_id = Column(UUID(as_uuid=True), ForeignKey("subject_subtopics.id", ondelete="CASCADE"), nullable=False)

    # Core BKT & Retention Parameters
    mastery_probability = Column(Float, default=0.10, nullable=False)    # P(L) Bayesian Knowledge Tracing
    memory_strength = Column(Float, default=1.0, nullable=False)         # R(t) Ebbinghaus retention
    stability_factor = Column(Float, default=1.0, nullable=False)        # Spaced repetition half-life S
    forgetting_risk = Column(Float, default=0.0, nullable=False)         # 1.0 - memory_strength
    student_ability_theta = Column(Float, default=0.0, nullable=False)   # IRT latent ability θ (-3 to +3)

    # Scheduling & Streaks
    current_interval_days = Column(Integer, default=1, nullable=False)
    next_revision_due = Column(DateTime(timezone=True), nullable=True)
    last_revised_at = Column(DateTime(timezone=True), nullable=True)
    review_count = Column(Integer, default=0, nullable=False)
    correct_streak = Column(Integer, default=0, nullable=False)
    wrong_streak = Column(Integer, default=0, nullable=False)

    # Totals
    total_attempts = Column(Integer, default=0, nullable=False)
    total_correct = Column(Integer, default=0, nullable=False)
    avg_response_time_ms = Column(Float, nullable=True)
    is_mastered = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "subtopic_id", name="uq_user_subtopic_state"),
        Index("ix_user_subtopic_due", "user_id", "next_revision_due"),
        Index("ix_user_subject_risk", "user_id", "subject_id", "forgetting_risk"),
    )


class RevisionHistorySession(Base):
    __tablename__ = "revision_history_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True)
    subtopic_id = Column(UUID(as_uuid=True), ForeignKey("subject_subtopics.id", ondelete="CASCADE"), nullable=True)
    session_title = Column(String(255), nullable=True)
    score_percentage = Column(Float, default=0.0)
    correct_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    earned_xp = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_rev_history_user_completed", "user_id", "completed_at"),
    )
