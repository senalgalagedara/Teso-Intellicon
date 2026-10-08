"""
TESO Adaptive Learning Platform — SQLAlchemy Models
====================================================
11 new tables that power the AI-driven adaptive learning engine.
"""

import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Float,
    ForeignKey, Text, JSON, Index, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class EventType(str, enum.Enum):
    QUIZ_ANSWERED = "quiz_answered"
    LESSON_COMPLETED = "lesson_completed"
    REVISION_DONE = "revision_done"
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"
    VIDEO_REWATCHED = "video_rewatched"
    CONFIDENCE_SUBMITTED = "confidence_submitted"
    PLAN_GENERATED = "plan_generated"
    SKILL_UNLOCKED = "skill_unlocked"
    BREAK_TAKEN = "break_taken"


class ActionType(str, enum.Enum):
    REVISE_NOW = "revise_now"
    NEW_LESSON = "new_lesson"
    TAKE_BREAK = "take_break"
    MCQ_PRACTICE = "mcq_practice"
    REVIEW_WEAK = "review_weak"


# ---------------------------------------------------------------------------
# 1. Skills — nodes in the knowledge graph
# ---------------------------------------------------------------------------

class Skill(Base):
    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(Integer, nullable=True)           # Chemistry unit number
    subject = Column(String(100), default="Chemistry")
    difficulty = Column(String(20), default=DifficultyLevel.MEDIUM)
    estimated_hours = Column(Float, nullable=True)  # avg hours to master
    syllabus_weight = Column(Float, default=0.0)    # % of exam
    lesson_ids = Column(JSON, default=list)         # mapped lesson float IDs
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# 2. Skill Prerequisites — DAG edges
# ---------------------------------------------------------------------------

class SkillPrerequisite(Base):
    __tablename__ = "skill_prerequisites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    prerequisite_skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    strength = Column(Float, default=1.0)  # 0-1: how strongly required


# ---------------------------------------------------------------------------
# 3. Questions — the question bank
# ---------------------------------------------------------------------------

class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False)
    text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=True)
    option_d = Column(Text, nullable=True)
    correct_answer = Column(String(1), nullable=False)   # 'A', 'B', 'C', 'D'
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(20), default=DifficultyLevel.MEDIUM)
    difficulty_score = Column(Float, default=0.5)        # 0.0 (easy) – 1.0 (hard)
    # IRT parameters (stub for Phase 3 — Item Response Theory)
    irt_discrimination = Column(Float, default=1.0)      # 'a' parameter
    irt_difficulty = Column(Float, default=0.0)          # 'b' parameter
    irt_guessing = Column(Float, default=0.25)           # 'c' parameter
    time_limit_seconds = Column(Integer, default=90)
    total_attempts = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    tags = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_questions_skill_difficulty", "skill_id", "difficulty_score"),
    )


# ---------------------------------------------------------------------------
# 4. Study Sessions — session-level behavioral signals
# ---------------------------------------------------------------------------

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Float, nullable=True)
    planned_duration_minutes = Column(Float, nullable=True)
    completion_rate = Column(Float, default=0.0)     # 0-1
    interruptions = Column(Integer, default=0)
    focus_score = Column(Float, nullable=True)        # 0-1 derived metric
    device_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_study_sessions_user_started", "user_id", "started_at"),
    )


# ---------------------------------------------------------------------------
# 5. Quiz Attempts — per-question attempt records
# ---------------------------------------------------------------------------

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("study_sessions.id"), nullable=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False)
    selected_answer = Column(String(1), nullable=True)   # null = skipped
    is_correct = Column(Boolean, nullable=False)
    response_time_ms = Column(Integer, nullable=True)    # milliseconds
    confidence_rating = Column(Integer, nullable=True)   # 1–5 self-rating
    retry_count = Column(Integer, default=0)
    hint_used = Column(Boolean, default=False)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_quiz_attempts_user_skill", "user_id", "skill_id"),
        Index("ix_quiz_attempts_user_date", "user_id", "attempted_at"),
    )


# ---------------------------------------------------------------------------
# 6. Revision Logs — spaced repetition history
# ---------------------------------------------------------------------------

class RevisionLog(Base):
    __tablename__ = "revision_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False)
    revised_at = Column(DateTime(timezone=True), server_default=func.now())
    performance_score = Column(Float, nullable=True)     # 0.0–1.0
    duration_minutes = Column(Float, nullable=True)
    memory_strength_before = Column(Float, nullable=True)
    memory_strength_after = Column(Float, nullable=True)
    interval_days = Column(Integer, nullable=True)       # days until next review
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_revision_logs_user_skill", "user_id", "skill_id"),
    )


# ---------------------------------------------------------------------------
# 7. User Skill State — THE CORE LEARNING STATE TABLE
#    Updated after every interaction. One row per (user, skill).
# ---------------------------------------------------------------------------

class UserSkillState(Base):
    __tablename__ = "user_skill_state"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False)

    # --- Mastery & Memory ---
    mastery_probability = Column(Float, default=0.0)     # 0.0–1.0 (BKT estimate)
    memory_strength = Column(Float, default=0.0)         # 0.0–1.0 (current retention)
    retention_score = Column(Float, default=0.0)         # rolling weighted accuracy
    stability_factor = Column(Float, default=1.0)        # spaced rep stability (S)

    # --- Confidence ---
    confidence_score = Column(Float, default=0.5)        # 0.0–1.0 blended estimate

    # --- Risk Signals ---
    forgetting_risk = Column(Float, default=0.0)         # 0.0–1.0 (1=about to forget)
    burnout_risk = Column(Float, default=0.0)            # 0.0–1.0 user-level
    attention_score = Column(Float, default=1.0)         # 0.0–1.0 engagement signal

    # --- Spaced Repetition ---
    review_count = Column(Integer, default=0)
    correct_streak = Column(Integer, default=0)
    wrong_streak = Column(Integer, default=0)
    next_revision_due = Column(DateTime(timezone=True), nullable=True)
    last_revised_at = Column(DateTime(timezone=True), nullable=True)
    current_interval_days = Column(Integer, default=1)

    # --- Performance Signals ---
    total_attempts = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    avg_response_time_ms = Column(Float, nullable=True)
    last_quiz_score = Column(Float, nullable=True)

    # --- State Metadata ---
    difficulty_level = Column(String(20), default=DifficultyLevel.EASY)
    is_unlocked = Column(Boolean, default=False)         # prerequisites met
    is_mastered = Column(Boolean, default=False)         # mastery ≥ 0.85
    last_activity = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_user_skill_state_user_skill", "user_id", "skill_id", unique=True),
        Index("ix_user_skill_state_next_revision", "user_id", "next_revision_due"),
    )


# ---------------------------------------------------------------------------
# 8. Daily Plans — AI-generated day-by-day plans
# ---------------------------------------------------------------------------

class DailyPlan(Base):
    __tablename__ = "daily_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan_date = Column(DateTime(timezone=True), nullable=False)
    planned_items = Column(JSON, default=list)    # list of {skill_id, action_type, duration_min, priority}
    total_planned_minutes = Column(Float, default=0.0)
    burnout_adjusted = Column(Boolean, default=False)
    generated_by = Column(String(50), default="rule_engine")  # "rule_engine" | "ml_model"
    status = Column(String(20), default="pending")    # pending | active | completed | skipped
    completion_rate = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_daily_plans_user_date", "user_id", "plan_date"),
    )


# ---------------------------------------------------------------------------
# 9. Plan Outcomes — actual vs planned performance tracking
# ---------------------------------------------------------------------------

class PlanOutcome(Base):
    __tablename__ = "plan_outcomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_plan_id = Column(UUID(as_uuid=True), ForeignKey("daily_plans.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=True)
    planned_action = Column(String(50), nullable=True)
    actual_action = Column(String(50), nullable=True)
    planned_minutes = Column(Float, nullable=True)
    actual_minutes = Column(Float, nullable=True)
    performance_score = Column(Float, nullable=True)    # 0-1
    completed = Column(Boolean, default=False)
    skipped_reason = Column(String(200), nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# 10. Event Log — append-only audit trail of all interactions
# ---------------------------------------------------------------------------

class EventLog(Base):
    __tablename__ = "event_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("study_sessions.id"), nullable=True)
    event_type = Column(String(50), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=True)
    payload = Column(JSON, default=dict)     # event-specific data
    client_timestamp = Column(DateTime(timezone=True), nullable=True)
    server_timestamp = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_event_log_user_type", "user_id", "event_type"),
        Index("ix_event_log_user_ts", "user_id", "server_timestamp"),
    )
