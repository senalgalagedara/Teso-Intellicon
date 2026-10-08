"""
TESO — Adaptive Learning API Routes
=======================================
All 16 adaptive endpoints under /api/adaptive/

These routes are the public-facing interface for the entire
AI adaptive learning engine.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.base_models import User
from app.models.adaptive_models import (
    UserSkillState, Skill, DailyPlan, StudySession
)
from app.schemas.adaptive_schemas import (
    TrackEventRequest, TrackEventResponse,
    SkillStateResponse, SkillGraphResponse, SkillGraphNode, SkillResponse,
    RevisionQueueItem, RevisionDoneRequest, RevisionDoneResponse,
    AdaptiveQuizResponse, QuestionResponse, QuizSubmitRequest, QuizSubmitResponse,
    RecommendationsResponse, RecommendationItem,
    WeakSkillsResponse, WeakSkillItem,
    DailyPlanResponse, DailyPlanItem, GeneratePlanRequest,
    BurnoutAssessment,
    SessionStartRequest, SessionStartResponse, SessionEndRequest, SessionEndResponse,
    InsightsResponse, LearningInsight,
    LearningDashboardResponse,
)
from app.services.event_tracker import track_event, start_session, end_session, get_recent_events
from app.services.user_state_engine import (
    update_skill_state_after_event,
    get_all_skill_states,
    get_or_create_skill_state,
    get_dashboard_summary,
)
from app.services.spaced_repetition import get_revision_queue, apply_revision
from app.services.adaptive_quiz_engine import generate_adaptive_quiz, process_quiz_submission
from app.services.weakness_detector import detect_weak_skills
from app.services.adaptive_recommender import get_recommendations, generate_daily_plan, generate_insights
from app.services.burnout_predictor import predict_burnout
from app.services.skill_graph import get_skill_graph_state, get_unlocked_skills, unlock_eligible_skills

router = APIRouter(prefix="/api/adaptive", tags=["adaptive-learning"])


# ---------------------------------------------------------------------------
# Helper: str to UUID safely
# ---------------------------------------------------------------------------

def _to_uuid(s: str) -> uuid.UUID:
    try:
        return uuid.UUID(s)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid UUID: {s}")


def _format_skill_state(state: UserSkillState, skill_name: Optional[str] = None) -> dict:
    """Convert UserSkillState ORM object to a response dict."""
    return {
        "id": str(state.id),
        "user_id": str(state.user_id),
        "skill_id": str(state.skill_id),
        "skill_name": skill_name,
        "mastery_probability": state.mastery_probability,
        "memory_strength": state.memory_strength,
        "retention_score": state.retention_score,
        "stability_factor": state.stability_factor,
        "confidence_score": state.confidence_score,
        "forgetting_risk": state.forgetting_risk,
        "burnout_risk": state.burnout_risk,
        "attention_score": state.attention_score,
        "review_count": state.review_count,
        "correct_streak": state.correct_streak,
        "wrong_streak": state.wrong_streak,
        "next_revision_due": state.next_revision_due,
        "last_revised_at": state.last_revised_at,
        "current_interval_days": state.current_interval_days,
        "total_attempts": state.total_attempts,
        "total_correct": state.total_correct,
        "avg_response_time_ms": state.avg_response_time_ms,
        "last_quiz_score": state.last_quiz_score,
        "difficulty_level": state.difficulty_level,
        "is_unlocked": state.is_unlocked,
        "is_mastered": state.is_mastered,
        "last_activity": state.last_activity,
        "updated_at": state.updated_at,
    }


# ===========================================================================
# 1. EVENT TRACKING
# ===========================================================================

@router.post("/events", response_model=TrackEventResponse, summary="Track a learning event")
def track_learning_event(
    request: TrackEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Track any user interaction and update the learning state.
    
    Supported event types:
    - quiz_answered: payload = {is_correct, response_time_ms, confidence_rating, selected_answer}
    - lesson_completed: payload = {completion_rate}
    - revision_done: payload = {performance_score, duration_minutes}
    - confidence_submitted: payload = {confidence_rating (1-5)}
    - video_rewatched: payload = {}
    - session_started / session_ended
    - break_taken
    """
    user_id = str(current_user.id)

    event = track_event(
        user_id=user_id,
        event_type=request.event_type.value,
        db=db,
        skill_id=request.skill_id,
        question_id=request.question_id,
        session_id=request.session_id,
        payload=request.payload,
        client_timestamp=request.client_timestamp,
    )

    # Update skill state if skill_id provided
    updated_state = None
    if request.skill_id:
        updated_state_obj = update_skill_state_after_event(
            user_id=user_id,
            skill_id=request.skill_id,
            event_type=request.event_type.value,
            db=db,
            payload=request.payload,
        )
        # Get skill name
        skill = db.query(Skill).filter(Skill.id == request.skill_id).first()
        state_dict = _format_skill_state(updated_state_obj, skill.name if skill else None)
        updated_state = SkillStateResponse(**state_dict)

    # Get next action
    recs = get_recommendations(user_id, db)
    primary = recs["primary_action"]
    next_action = RecommendationItem(**primary)

    db.commit()

    return TrackEventResponse(
        event_id=str(event.id),
        updated_skill_state=updated_state,
        next_action=next_action,
        message=f"Event '{request.event_type.value}' tracked successfully",
    )


# ===========================================================================
# 2. SESSION MANAGEMENT
# ===========================================================================

@router.post("/sessions/start", response_model=SessionStartResponse, summary="Start a study session")
def start_study_session(
    request: SessionStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new study session and get a session_id for subsequent events."""
    session = start_session(
        user_id=str(current_user.id),
        db=db,
        planned_duration_minutes=request.planned_duration_minutes,
        device_type=request.device_type,
    )
    return SessionStartResponse(
        session_id=str(session.id),
        started_at=session.started_at,
        message="Session started. Good luck! 📚",
    )


@router.post("/sessions/end", response_model=SessionEndResponse, summary="End a study session")
def end_study_session(
    request: SessionEndRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """End a study session and update focus score."""
    try:
        session = end_session(
            session_id=request.session_id,
            user_id=str(current_user.id),
            db=db,
            interruptions=request.interruptions,
            completion_rate=request.completion_rate,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return SessionEndResponse(
        session_id=str(session.id),
        duration_minutes=session.duration_minutes or 0,
        focus_score=session.focus_score or 0.0,
        message=f"Session complete! Duration: {session.duration_minutes:.0f} min. Focus score: {(session.focus_score or 0)*100:.0f}%",
    )


# ===========================================================================
# 3. LEARNING STATE
# ===========================================================================

@router.get("/state", summary="Get full learning state for current user")
def get_learning_state(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all skill states with real-time memory decay applied."""
    user_id = str(current_user.id)
    states_data = get_all_skill_states(user_id, db)

    result = []
    for item in states_data:
        state = item["state"]
        skill = item["skill"]
        state_dict = _format_skill_state(state, skill.name)
        state_dict["realtime_memory_strength"] = item["realtime_memory_strength"]
        state_dict["realtime_forgetting_risk"] = item["realtime_forgetting_risk"]
        result.append(state_dict)

    return {"user_id": user_id, "skill_states": result, "total": len(result)}


@router.get("/state/skill/{skill_id}", summary="Get state for a specific skill")
def get_skill_state(
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the detailed learning state for one skill."""
    user_id = str(current_user.id)
    state = get_or_create_skill_state(user_id, skill_id, db)
    db.commit()

    skill = db.query(Skill).filter(Skill.id == _to_uuid(skill_id)).first()
    skill_name = skill.name if skill else None

    return _format_skill_state(state, skill_name)


# ===========================================================================
# 4. REVISION QUEUE (Spaced Repetition)
# ===========================================================================

@router.get("/revision-queue", summary="Get today's spaced repetition revision queue")
def get_revision_queue_endpoint(
    limit: int = Query(default=10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns skills due for revision today, sorted by urgency.
    Skills are flagged when memory decays below the forgetting threshold.
    """
    queue = get_revision_queue(str(current_user.id), db, max_items=limit)
    return {
        "user_id": str(current_user.id),
        "revision_queue": queue,
        "total_due": len(queue),
        "generated_at": datetime.now(timezone.utc),
    }


@router.post("/revision-done", response_model=RevisionDoneResponse, summary="Mark a revision as complete")
def mark_revision_done(
    request: RevisionDoneRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record a completed revision session.
    Updates memory strength, stability factor, and schedules next review.
    """
    try:
        result = apply_revision(
            user_id=str(current_user.id),
            skill_id=request.skill_id,
            performance_score=request.performance_score,
            duration_minutes=request.duration_minutes,
            db=db,
            confidence_rating=request.confidence_rating,
            notes=request.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Also track the event
    track_event(
        user_id=str(current_user.id),
        event_type="revision_done",
        db=db,
        skill_id=request.skill_id,
        session_id=request.session_id,
        payload={
            "performance_score": request.performance_score,
            "duration_minutes": request.duration_minutes,
        }
    )
    db.commit()

    return RevisionDoneResponse(**result)


# ===========================================================================
# 5. ADAPTIVE QUIZ
# ===========================================================================

@router.get("/quiz/adaptive", response_model=AdaptiveQuizResponse, summary="Generate adaptive quiz")
def get_adaptive_quiz(
    skill_ids: str = Query(..., description="Comma-separated skill UUIDs"),
    count: int = Query(default=10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an adaptive quiz calibrated to the student's current mastery level.
    Questions are selected from the appropriate difficulty band with
    spaced repetition weighting toward weaker, higher-risk skills.
    """
    skill_id_list = [s.strip() for s in skill_ids.split(",") if s.strip()]
    if not skill_id_list:
        raise HTTPException(status_code=422, detail="At least one skill_id required")

    try:
        quiz = generate_adaptive_quiz(
            user_id=str(current_user.id),
            skill_ids=skill_id_list,
            db=db,
            total_questions=count,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    skill_name_map = quiz.get("skill_name_map", {})

    questions = []
    for q in quiz["questions"]:
        questions.append(QuestionResponse(
            id=str(q.id),
            skill_id=str(q.skill_id),
            skill_name=skill_name_map.get(str(q.skill_id)),
            text=q.text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            difficulty=q.difficulty,
            difficulty_score=q.difficulty_score,
            time_limit_seconds=q.time_limit_seconds,
            tags=q.tags or [],
        ))

    return AdaptiveQuizResponse(
        quiz_id=quiz["quiz_id"],
        skill_ids=skill_id_list,
        questions=questions,
        calibrated_difficulty=quiz["calibrated_difficulty"],
        estimated_duration_minutes=quiz["estimated_duration_minutes"],
        generated_at=quiz["generated_at"],
    )


@router.post("/quiz/submit", response_model=QuizSubmitResponse, summary="Submit quiz answers")
def submit_quiz(
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit quiz answers for processing.
    Updates mastery (BKT), memory strength, and returns the next recommended action.
    """
    answers_dicts = [a.model_dump() for a in request.answers]
    result = process_quiz_submission(
        user_id=str(current_user.id),
        answers=answers_dicts,
        db=db,
        session_id=request.session_id,
    )

    # Get next action
    recs = get_recommendations(str(current_user.id), db)

    # Format skill updates
    skill_update_responses = []
    for state in result["skill_updates"]:
        skill = db.query(Skill).filter(Skill.id == state.skill_id).first()
        state_dict = _format_skill_state(state, skill.name if skill else None)
        skill_update_responses.append(SkillStateResponse(**state_dict))

    next_action = RecommendationItem(**recs["primary_action"])

    return QuizSubmitResponse(
        total_questions=result["total_questions"],
        correct_count=result["correct_count"],
        score=result["score"],
        avg_response_time_ms=result["avg_response_time_ms"],
        skill_updates=skill_update_responses,
        next_action=next_action,
        achievements=result["achievements"],
        message=result["message"],
    )


# ===========================================================================
# 6. SKILL GRAPH
# ===========================================================================

@router.get("/skills/graph", summary="Get full skill graph with mastery overlay")
def get_skill_graph(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the full Chemistry A/L skill graph with the student's mastery,
    memory strength, unlock status, and prerequisite relationships overlaid.
    """
    graph = get_skill_graph_state(str(current_user.id), db)

    nodes = []
    for node in graph["nodes"]:
        skill = node["skill"]
        nodes.append({
            "skill": {
                "id": str(skill.id),
                "name": skill.name,
                "description": skill.description,
                "unit": skill.unit,
                "subject": skill.subject,
                "difficulty": skill.difficulty,
                "estimated_hours": skill.estimated_hours,
                "syllabus_weight": skill.syllabus_weight,
                "lesson_ids": skill.lesson_ids or [],
                "is_active": skill.is_active,
            },
            "mastery_probability": node["mastery_probability"],
            "memory_strength": node["memory_strength"],
            "is_unlocked": node["is_unlocked"],
            "is_mastered": node["is_mastered"],
            "next_revision_due": node["next_revision_due"],
            "prerequisites": node["prerequisites"],
            "dependents": node["dependents"],
        })

    return {
        "user_id": str(current_user.id),
        "nodes": nodes,
        "total_skills": graph["total_skills"],
        "mastered_count": graph["mastered_count"],
        "in_progress_count": graph["in_progress_count"],
        "unlocked_count": graph["unlocked_count"],
        "overall_mastery": graph["overall_mastery"],
    }


@router.get("/skills/weak", summary="Get detected weak skills")
def get_weak_skills(
    limit: int = Query(default=10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns ranked list of skills where the student is struggling,
    with weakness score, contributing factors, and recommended actions.
    """
    result = detect_weak_skills(str(current_user.id), db, limit=limit)
    return {
        "user_id": str(current_user.id),
        "weak_skills": result["weak_skills"],
        "total_weak": result["total_weak"],
        "critical_count": result["critical_count"],
        "generated_at": datetime.now(timezone.utc),
    }


@router.get("/skills/unlocked", summary="Get currently unlockable skills")
def get_unlocked_skills_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all skills whose prerequisites are met and are ready to learn.
    Also triggers any newly eligible skill unlocks.
    """
    user_id = str(current_user.id)
    newly_unlocked = unlock_eligible_skills(user_id, db)
    unlocked = get_unlocked_skills(user_id, db)

    skills_out = []
    for node in unlocked:
        skill = node.get("skill")
        if not skill:
            continue
        skills_out.append({
            "id": str(skill.id),
            "name": skill.name,
            "unit": skill.unit,
            "difficulty": skill.difficulty,
            "estimated_hours": skill.estimated_hours,
            "syllabus_weight": skill.syllabus_weight,
            "mastery_probability": node.get("mastery_probability", 0.0),
            "is_mastered": node.get("is_mastered", False),
        })

    return {
        "user_id": user_id,
        "unlocked_skills": skills_out,
        "newly_unlocked": newly_unlocked,
        "total_unlocked": len(skills_out),
    }


# ===========================================================================
# 7. RECOMMENDATIONS
# ===========================================================================

@router.get("/recommendations", summary="Get AI-generated learning recommendations")
def get_learning_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns prioritized list of recommended actions.
    Implements the full observe → estimate → predict → adapt feedback loop.
    
    Action types: revise_now | new_lesson | take_break | mcq_practice | review_weak
    """
    result = get_recommendations(str(current_user.id), db)
    return result


# ===========================================================================
# 8. DAILY PLAN
# ===========================================================================

@router.get("/daily-plan", summary="Get today's AI-generated study plan")
def get_daily_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns today's study plan. If a plan already exists for today, returns it.
    Otherwise generates a new adaptive plan.
    """
    result = generate_daily_plan(str(current_user.id), db)
    return result


@router.post("/daily-plan/generate", summary="Force regenerate today's study plan")
def regenerate_daily_plan(
    request: GeneratePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Force-regenerate today's study plan, optionally with a custom available_minutes.
    Burnout risk is automatically factored into the plan.
    """
    result = generate_daily_plan(
        user_id=str(current_user.id),
        db=db,
        available_minutes=request.available_minutes,
        force_regenerate=True,
    )
    return result


# ===========================================================================
# 9. BURNOUT
# ===========================================================================

@router.get("/burnout/risk", summary="Get burnout risk assessment")
def get_burnout_risk(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assess current burnout risk based on study patterns, focus scores,
    session lengths, and performance trends over the last 14 days.
    """
    result = predict_burnout(str(current_user.id), db)
    return {
        "user_id": str(current_user.id),
        "burnout_risk": result["burnout_risk"],
        "risk_level": result["risk_level"],
        "contributing_factors": result["contributing_factors"],
        "recommendations": result["recommendations"],
        "suggested_daily_hours": result["suggested_daily_hours"],
        "recommended_rest_day": result["recommended_rest_day"],
        "assessed_at": datetime.now(timezone.utc),
    }


# ===========================================================================
# 10. INSIGHTS
# ===========================================================================

@router.get("/insights", summary="Get personalized learning insights")
def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns personalized insights including milestones, weaknesses,
    strengths, trends, and warnings based on the student's learning state.
    """
    insights = generate_insights(str(current_user.id), db)
    return {
        "user_id": str(current_user.id),
        "insights": insights,
        "generated_at": datetime.now(timezone.utc),
    }


# ===========================================================================
# 11. DASHBOARD
# ===========================================================================

@router.get("/dashboard", summary="Get comprehensive learning dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a comprehensive snapshot of the student's learning state:
    - Overall mastery and progress
    - Today's study time
    - Current streak
    - Burnout risk
    - Revision queue
    - Next recommended action
    - Top weak skills
    - Recent activity
    """
    user_id = str(current_user.id)

    # Core dashboard data
    summary = get_dashboard_summary(user_id, db)
    revision_queue = get_revision_queue(user_id, db, max_items=5)
    recommendations = get_recommendations(user_id, db)
    weak_data = detect_weak_skills(user_id, db, limit=3, min_attempts=1)
    burnout = predict_burnout(user_id, db)
    recent_events = [
        {
            "event_type": e.event_type,
            "timestamp": e.server_timestamp.isoformat(),
            "payload": e.payload,
        }
        for e in get_recent_events(user_id, db, limit=5)
    ]

    # Compute current streak (consecutive study days)
    streak = _compute_streak(user_id, db)

    # Week's total study time
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    week_sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == user_id,
            StudySession.started_at >= week_ago,
            StudySession.duration_minutes.isnot(None),
        )
        .all()
    )
    study_minutes_week = sum(s.duration_minutes or 0 for s in week_sessions)

    return {
        "user_id": user_id,
        "overall_mastery": summary["overall_mastery"],
        "skills_mastered": summary["skills_mastered"],
        "skills_in_progress": summary["skills_in_progress"],
        "total_study_minutes_today": summary["total_study_minutes_today"],
        "total_study_minutes_week": round(study_minutes_week, 1),
        "current_streak_days": streak,
        "burnout_risk": burnout["burnout_risk"],
        "burnout_recommendation": burnout["recommendations"][0] if burnout["recommendations"] else "",
        "revision_due_count": len(revision_queue),
        "revision_queue": revision_queue,
        "next_action": recommendations["primary_action"],
        "top_weak_skills": weak_data["weak_skills"][:3],
        "recent_events": recent_events,
        "generated_at": now,
    }


def _compute_streak(user_id: str, db: Session) -> int:
    """Compute consecutive study day streak."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == user_id,
            StudySession.duration_minutes.isnot(None),
            StudySession.duration_minutes > 0,
        )
        .order_by(StudySession.started_at.desc())
        .all()
    )
    if not sessions:
        return 0

    days_studied = set()
    for s in sessions:
        day = s.started_at.strftime("%Y-%m-%d")
        days_studied.add(day)

    streak = 0
    check_day = now.date()
    while check_day.strftime("%Y-%m-%d") in days_studied:
        streak += 1
        check_day = check_day - timedelta(days=1)
    return streak
