from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


class PlanInput(BaseModel):
    user_id: str
    months: int = Field(..., ge=1, le=24, description="Months until A/L exam")
    hours_per_day: float = Field(..., ge=1.0, le=16.0, description="Study hours per day")
    off_days: int = Field(..., ge=0, le=6, description="Off days per week")
    skipped_lesson_ids: List[float] = Field(
        default=[],
        description="Lesson IDs (e.g. 1.1, 2.3) to skip — already puluwn lessons"
    )


class LessonItem(BaseModel):
    unit: int
    id: float
    est_time: float
    lesson_time: float
    syllabus_p: float
    total_syl: float
    mcq: int
    mcq_wt: float
    mcq_time: float
    part_wt: float
    p2_time: float
    total_time_cost: float


class DayPlan(BaseModel):
    day: int
    lesson_unit: Optional[int]
    lesson_id: Optional[float]
    lesson_time_cost: Optional[float]
    mcq_unit: Optional[int]
    mcq_id: Optional[float]
    mcq_time_cost: Optional[float]
    p2_unit: Optional[int]
    p2_id: Optional[float]
    p2_time_cost: Optional[float]
    total_day_time: float


class PlanResult(BaseModel):
    plan_id: Optional[str] = None
    user_id: str
    months: int
    hours_per_day: float
    off_days: int
    total_days: int
    total_hours: float
    lessons_in_plan: List[LessonItem]
    daily_plan: List[DayPlan]
    created_at: Optional[datetime] = None


class SavedPlanResponse(BaseModel):
    plan_id: str
    message: str
    created_at: datetime


class PlanListItem(BaseModel):
    plan_id: str
    months: int
    hours_per_day: float
    off_days: int
    total_days: int
    total_hours: float
    lessons_count: int
    created_at: datetime
