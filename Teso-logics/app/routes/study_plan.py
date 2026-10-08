import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from pydantic import BaseModel

from app.models.study_plan import (
    PlanInput,
    PlanResult,
    SavedPlanResponse,
    PlanListItem,
)
from app.services.study_plan_service import compute_study_plan
from app.core.db import (
    save_study_plan,
    get_study_plans_for_user,
    get_study_plan_by_id,
    delete_study_plan,
    upsert_day_progress,
    get_plan_progress,
)

router = APIRouter(prefix="/study-plan", tags=["Study Plan"])


@router.post("/generate", response_model=PlanResult)
def generate_plan(plan_input: PlanInput):
    """
    Compute (but do NOT save) a personalised study plan.
    Useful for preview before saving.
    """
    try:
        result = compute_study_plan(plan_input)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save", response_model=SavedPlanResponse)
def generate_and_save_plan(plan_input: PlanInput):
    """
    Compute a personalised study plan AND persist it to the database.
    Returns the saved plan's ID.
    """
    try:
        result = compute_study_plan(plan_input)

        plan_data = {
            "months": result.months,
            "hours_per_day": result.hours_per_day,
            "off_days": result.off_days,
            "total_days": result.total_days,
            "total_hours": result.total_hours,
            "daily_plan": [d.model_dump() for d in result.daily_plan],
        }

        plan_id = save_study_plan(plan_input.user_id, plan_data)
        return SavedPlanResponse(
            plan_id=plan_id,
            message="Study plan saved successfully.",
            created_at=datetime.now(timezone.utc),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}", response_model=List[PlanListItem])
def list_user_plans(user_id: str):
    """Return all study plans saved for a given user (summary list)."""
    try:
        rows = get_study_plans_for_user(user_id)
        result = []
        for r in rows:
            plan_data = r["planData"] if isinstance(r["planData"], list) else json.loads(r["planData"])
            result.append(
                PlanListItem(
                    plan_id=r["id"],
                    months=r["months"],
                    hours_per_day=r["hoursPerDay"],
                    off_days=r["offDays"],
                    total_days=r["totalDays"],
                    total_hours=r["totalHours"],
                    lessons_count=len(plan_data),
                    created_at=r["createdAt"],
                )
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plan_id}", response_model=PlanResult)
def get_plan(plan_id: str):
    """Fetch a saved study plan by its ID."""
    try:
        row = get_study_plan_by_id(plan_id)
        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")

        plan_data = row["planData"] if isinstance(row["planData"], list) else json.loads(row["planData"])

        return PlanResult(
            plan_id=row["id"],
            user_id=row["userId"],
            months=row["months"],
            hours_per_day=row["hoursPerDay"],
            off_days=row["offDays"],
            total_days=row["totalDays"],
            total_hours=row["totalHours"],
            lessons_in_plan=[],   # not stored separately; daily_plan is the source
            daily_plan=plan_data,
            created_at=row["createdAt"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{plan_id}")
def remove_plan(plan_id: str, user_id: str):
    """Delete a study plan. Pass user_id as a query parameter for ownership check."""
    try:
        deleted = delete_study_plan(plan_id, user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Plan not found or not owned by user")
        return {"message": "Plan deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Day Progress endpoints ───────────────────────────────────────────────────

class DayProgressUpdate(BaseModel):
    user_id: str
    day_number: int
    lesson_done: Optional[bool] = None
    mcq_done: Optional[bool] = None
    p2_done: Optional[bool] = None


class DayProgressRecord(BaseModel):
    id: str
    plan_id: str
    user_id: str
    day_number: int
    lesson_done: bool
    mcq_done: bool
    p2_done: bool
    day_completed: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


@router.post("/{plan_id}/progress", response_model=DayProgressRecord)
def update_day_progress(plan_id: str, body: DayProgressUpdate):
    """Upsert lesson / MCQ / Part-2 completion for a single day."""
    try:
        row = upsert_day_progress(
            plan_id=plan_id,
            user_id=body.user_id,
            day_number=body.day_number,
            lesson_done=body.lesson_done,
            mcq_done=body.mcq_done,
            p2_done=body.p2_done,
        )
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plan_id}/progress", response_model=List[DayProgressRecord])
def list_plan_progress(plan_id: str):
    """Return all day-progress records for a saved plan."""
    try:
        return get_plan_progress(plan_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
