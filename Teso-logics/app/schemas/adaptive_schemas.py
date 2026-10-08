"""
TESO Adaptive Learning Platform — Pydantic Schemas
===================================================
Request/response validation for all adaptive API endpoints.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EventTypeEnum(str, Enum):
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


class ActionTypeEnum(str, Enum):
    REVISE_NOW = "revise_now"
    NEW_LESSON = "new_lesson"
    TAKE_BREAK = "take_break"
    MCQ_PRACTICE = "mcq_practice"
    REVIEW_WEAK = "review_weak"


class DifficultyEnum(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


# ---------------------------------------------------------------------------
# Event Tracking
# ---------------------------------------------------------------------------

class TrackEventRequest(BaseModel):
    event_type: EventTypeEnum
    skill_id: Optional[str] = None
    question_id: Optional[str] = None
    session_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    client_timestamp: Optional[datetime] = None

    model_config = {"json_schema_extra": {
        "example": {
            "event_type": "quiz_answered",
            "skill_id": "uuid-here",
            "question_id": "uuid-here",
            "payload": {
                "is_correct": True,
                "response_time_ms": 8500,
                "confidence_rating": 4,
                "selected_answer": "B"
            }
        }
    }}


class TrackEventResponse(BaseModel):
    event_id: str
    updated_skill_state: Optional["SkillStateResponse"] = None
    next_action: Optional["RecommendationItem"] = None
    message: str = "Event tracked"


# ---------------------------------------------------------------------------
# Skill Schemas
# ---------------------------------------------------------------------------

class SkillResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    unit: Optional[int]
    subject: str
    difficulty: str
    estimated_hours: Optional[float]
    syllabus_weight: float
    lesson_ids: List[Any]
    is_active: bool

    model_config = {"from_attributes": True}


class SkillGraphNode(BaseModel):
    skill: SkillResponse
    mastery_probability: float = 0.0
    memory_strength: float = 0.0
    is_unlocked: bool = False
    is_mastered: bool = False
    next_revision_due: Optional[datetime] = None
    prerequisites: List[str] = Field(default_factory=list)  # skill IDs
    dependents: List[str] = Field(default_factory=list)     # skills that need this


class SkillGraphResponse(BaseModel):
    user_id: str
    nodes: List[SkillGraphNode]
    total_skills: int
    mastered_count: int
    in_progress_count: int
    unlocked_count: int
    overall_mastery: float


# ---------------------------------------------------------------------------
# User Learning State
# ---------------------------------------------------------------------------

class SkillStateResponse(BaseModel):
    id: str
    user_id: str
    skill_id: str
    skill_name: Optional[str] = None

    # Mastery & Memory
    mastery_probability: float
    memory_strength: float
    retention_score: float
    stability_factor: float

    # Confidence
    confidence_score: float

    # Risk signals
    forgetting_risk: float
    burnout_risk: float
    attention_score: float

    # Spaced Repetition
    review_count: int
    correct_streak: int
    wrong_streak: int
    next_revision_due: Optional[datetime]
    last_revised_at: Optional[datetime]
    current_interval_days: int

    # Performance
    total_attempts: int
    total_correct: int
    avg_response_time_ms: Optional[float]
    last_quiz_score: Optional[float]

    # State
    difficulty_level: str
    is_unlocked: bool
    is_mastered: bool
    last_activity: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class LearningDashboardResponse(BaseModel):
    user_id: str
    # Overall stats
    overall_mastery: float
    skills_mastered: int
    skills_in_progress: int
    total_study_minutes_today: float
    total_study_minutes_week: float
    current_streak_days: int
    # Risk signals
    burnout_risk: float
    burnout_recommendation: str
    # Today
    revision_due_count: int
    revision_queue: List["RevisionQueueItem"]
    # Next action
    next_action: Optional["RecommendationItem"]
    # Weak skills
    top_weak_skills: List["WeakSkillItem"]
    # Recent activity
    recent_events: List[Dict[str, Any]]
    generated_at: datetime


# ---------------------------------------------------------------------------
# Spaced Repetition / Revision Queue
# ---------------------------------------------------------------------------

class RevisionQueueItem(BaseModel):
    skill_id: str
    skill_name: str
    forgetting_risk: float
    memory_strength: float
    days_overdue: int
    suggested_duration_minutes: int
    mastery_probability: float
    last_revised_at: Optional[datetime]
    priority: int  # 1 = highest


class RevisionDoneRequest(BaseModel):
    skill_id: str
    session_id: Optional[str] = None
    performance_score: float = Field(..., ge=0.0, le=1.0)
    duration_minutes: float = Field(..., gt=0)
    confidence_rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class RevisionDoneResponse(BaseModel):
    skill_id: str
    skill_name: str
    memory_strength_before: float
    memory_strength_after: float
    mastery_probability: float
    next_revision_due: datetime
    interval_days: int
    message: str


# ---------------------------------------------------------------------------
# Quiz Engine
# ---------------------------------------------------------------------------

class QuestionResponse(BaseModel):
    id: str
    skill_id: str
    skill_name: Optional[str] = None
    text: str
    option_a: str
    option_b: str
    option_c: Optional[str]
    option_d: Optional[str]
    difficulty: str
    difficulty_score: float
    time_limit_seconds: int
    tags: List[str]

    model_config = {"from_attributes": True}


class AdaptiveQuizResponse(BaseModel):
    quiz_id: str
    skill_ids: List[str]
    questions: List[QuestionResponse]
    calibrated_difficulty: float
    estimated_duration_minutes: float
    generated_at: datetime


class QuizAnswerItem(BaseModel):
    question_id: str
    skill_id: str
    selected_answer: Optional[str] = None
    response_time_ms: int
    confidence_rating: Optional[int] = Field(None, ge=1, le=5)
    hint_used: bool = False


class QuizSubmitRequest(BaseModel):
    session_id: Optional[str] = None
    answers: List[QuizAnswerItem]

    @field_validator("answers")
    @classmethod
    def at_least_one_answer(cls, v):
        if len(v) == 0:
            raise ValueError("Must submit at least one answer")
        return v


class QuizSubmitResponse(BaseModel):
    total_questions: int
    correct_count: int
    score: float
    avg_response_time_ms: float
    skill_updates: List[SkillStateResponse]
    next_action: Optional["RecommendationItem"]
    achievements: List[str] = Field(default_factory=list)
    message: str


# ---------------------------------------------------------------------------
# AI Recommendations
# ---------------------------------------------------------------------------

class RecommendationItem(BaseModel):
    action_type: ActionTypeEnum
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    reason: str
    urgency: float = Field(..., ge=0.0, le=1.0)   # 0=low, 1=critical
    estimated_duration_minutes: Optional[int] = None
    supporting_data: Dict[str, Any] = Field(default_factory=dict)


class RecommendationsResponse(BaseModel):
    user_id: str
    recommendations: List[RecommendationItem]
    primary_action: RecommendationItem
    generated_at: datetime


# ---------------------------------------------------------------------------
# Weakness Detection
# ---------------------------------------------------------------------------

class WeakSkillItem(BaseModel):
    skill_id: str
    skill_name: str
    weakness_score: float          # 0-1 (1 = very weak)
    mastery_probability: float
    accuracy_rate: float
    avg_response_time_ms: Optional[float]
    wrong_streak: int
    forgetting_risk: float
    recommended_action: ActionTypeEnum
    suggested_focus_minutes: int


class WeakSkillsResponse(BaseModel):
    user_id: str
    weak_skills: List[WeakSkillItem]
    total_weak: int
    critical_count: int    # weakness_score > 0.7
    generated_at: datetime


# ---------------------------------------------------------------------------
# Daily Plan
# ---------------------------------------------------------------------------

class DailyPlanItem(BaseModel):
    skill_id: str
    skill_name: str
    action_type: ActionTypeEnum
    duration_minutes: int
    priority: int
    mastery: float
    forgetting_risk: float
    reason: str


class DailyPlanResponse(BaseModel):
    plan_id: str
    user_id: str
    plan_date: datetime
    items: List[DailyPlanItem]
    total_planned_minutes: float
    burnout_adjusted: bool
    completion_rate: Optional[float]
    status: str
    generated_at: datetime


class GeneratePlanRequest(BaseModel):
    available_minutes: Optional[int] = Field(None, gt=0, le=600)
    force_regenerate: bool = False
    target_date: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Burnout
# ---------------------------------------------------------------------------

class BurnoutAssessment(BaseModel):
    user_id: str
    burnout_risk: float
    risk_level: str   # "low" | "moderate" | "high" | "critical"
    contributing_factors: List[str]
    recommendations: List[str]
    suggested_daily_hours: float
    recommended_rest_day: bool
    assessed_at: datetime


# ---------------------------------------------------------------------------
# Study Session
# ---------------------------------------------------------------------------

class SessionStartRequest(BaseModel):
    planned_duration_minutes: Optional[float] = None
    device_type: Optional[str] = None


class SessionStartResponse(BaseModel):
    session_id: str
    started_at: datetime
    message: str


class SessionEndRequest(BaseModel):
    session_id: str
    interruptions: int = 0
    completion_rate: float = Field(default=1.0, ge=0.0, le=1.0)


class SessionEndResponse(BaseModel):
    session_id: str
    duration_minutes: float
    focus_score: float
    message: str


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------

class LearningInsight(BaseModel):
    type: str          # "strength" | "weakness" | "trend" | "milestone" | "warning"
    title: str
    description: str
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    metric_value: Optional[float] = None
    action_suggestion: Optional[str] = None


class InsightsResponse(BaseModel):
    user_id: str
    insights: List[LearningInsight]
    generated_at: datetime
