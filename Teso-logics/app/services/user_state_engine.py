"""
TESO — User State Engine
==========================
Central coordinator that updates the "User Learning State" after every interaction.
This is the most important service in the system — called after every event.

After each event it:
  1. Updates mastery (via BKT)
  2. Recalculates memory strength (forgetting curve)
  3. Recomputes forgetting risk
  4. Updates confidence score
  5. Adjusts burnout risk signal
  6. Sets next_revision_due via spaced repetition
  7. Persists updated state to user_skill_state table
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.models.adaptive_models import UserSkillState, Skill, StudySession, EventLog
from app.services.mastery_estimator import update_mastery_after_quiz, DEFAULT_P_PRIOR
from app.services.spaced_repetition import (
    calculate_memory_strength,
    calculate_forgetting_risk,
    calculate_next_review,
)


# ---------------------------------------------------------------------------
# Get or Create Skill State
# ---------------------------------------------------------------------------

def get_or_create_skill_state(
    user_id: str,
    skill_id: str,
    db: Session,
) -> UserSkillState:
    """
    Fetch the skill state for a user, creating it (with defaults) if it doesn't exist.
    The skill must be in the skills table first (seeded via startup).
    """
    state = (
        db.query(UserSkillState)
        .filter(
            UserSkillState.user_id == user_id,
            UserSkillState.skill_id == skill_id,
        )
        .first()
    )
    if state:
        return state

    # Check if the skill has prerequisites; if none → unlock immediately
    from app.services.skill_graph import check_prerequisites_met
    prereqs_met = check_prerequisites_met(user_id, skill_id, db)

    state = UserSkillState(
        user_id=user_id,
        skill_id=skill_id,
        mastery_probability=DEFAULT_P_PRIOR,
        memory_strength=0.0,
        confidence_score=0.5,
        forgetting_risk=0.0,
        burnout_risk=0.0,
        attention_score=1.0,
        retention_score=0.0,
        stability_factor=1.0,
        review_count=0,
        correct_streak=0,
        wrong_streak=0,
        total_attempts=0,
        total_correct=0,
        is_unlocked=prereqs_met,
        is_mastered=False,
        difficulty_level="easy",
    )
    db.add(state)
    db.flush()
    return state


# ---------------------------------------------------------------------------
# Main State Update — called after EVERY interaction
# ---------------------------------------------------------------------------

def update_skill_state_after_event(
    user_id: str,
    skill_id: str,
    event_type: str,
    db: Session,
    payload: Optional[Dict[str, Any]] = None,
) -> UserSkillState:
    """
    Master function: update all fields of user_skill_state after an event.
    
    Event types handled:
      - quiz_answered       → BKT mastery update, memory update
      - lesson_completed    → unlock logic, initial memory seeding
      - revision_done       → handled by spaced_repetition.apply_revision
      - confidence_submitted → blend confidence signal
      - video_rewatched     → small attention/retention boost
    
    Returns the updated state.
    """
    payload = payload or {}
    now = datetime.now(timezone.utc)

    state = get_or_create_skill_state(user_id, skill_id, db)

    if event_type == "quiz_answered":
        is_correct = bool(payload.get("is_correct", False))
        confidence_rating = payload.get("confidence_rating")
        response_time_ms = payload.get("response_time_ms")

        # BKT mastery update
        state = update_mastery_after_quiz(
            user_id=user_id,
            skill_id=skill_id,
            is_correct=is_correct,
            confidence_rating=confidence_rating,
            response_time_ms=response_time_ms,
            db=db,
        )
        # Memory: each quiz attempt reinforces memory slightly
        state.memory_strength = min(
            1.0,
            state.memory_strength + (0.1 if is_correct else 0.03)
        )
        state.forgetting_risk = calculate_forgetting_risk(state.memory_strength)

        # If this is first review, set initial spaced rep
        if state.review_count == 1 or state.next_revision_due is None:
            perf = 1.0 if is_correct else 0.0
            next_due, interval, stability = calculate_next_review(
                current_interval_days=1,
                stability_factor=state.stability_factor,
                performance_score=perf,
                review_count=state.review_count,
            )
            state.next_revision_due = next_due
            state.current_interval_days = interval
            state.stability_factor = stability
            state.last_revised_at = now

        # Update retention score (rolling weighted accuracy)
        acc = 1.0 if is_correct else 0.0
        state.retention_score = round(
            state.retention_score * 0.75 + acc * 0.25, 4
        )

    elif event_type == "lesson_completed":
        # Student completed a lesson → unlock skill, seed initial memory
        state.is_unlocked = True
        state.memory_strength = min(1.0, state.memory_strength + 0.3)
        state.retention_score = min(1.0, state.retention_score + 0.2)

        completion_rate = payload.get("completion_rate", 1.0)
        state.attention_score = round(
            state.attention_score * 0.7 + float(completion_rate) * 0.3, 4
        )

        # Seed first revision if not set
        if state.next_revision_due is None:
            from datetime import timedelta
            state.next_revision_due = now + timedelta(days=1)
            state.current_interval_days = 1

    elif event_type == "confidence_submitted":
        # Student self-reported confidence
        rating = payload.get("confidence_rating", 3)
        conf_normalized = (int(rating) - 1) / 4.0
        state.confidence_score = round(
            state.confidence_score * 0.6 + conf_normalized * 0.4, 4
        )

    elif event_type == "video_rewatched":
        # Re-watching indicates possible confusion or reinforcement
        # Small memory and attention boost
        state.memory_strength = min(1.0, state.memory_strength + 0.05)
        state.attention_score = min(1.0, state.attention_score + 0.03)
        state.forgetting_risk = calculate_forgetting_risk(state.memory_strength)

    # Always: update real-time memory decay and last_activity
    _apply_memory_decay(state, now)
    state.last_activity = now
    db.commit()
    db.refresh(state)
    return state


def _apply_memory_decay(state: UserSkillState, now: datetime) -> None:
    """
    Recalculate memory_strength and forgetting_risk using the
    Ebbinghaus curve based on time elapsed since last revision.
    """
    if state.last_revised_at is None:
        return

    elapsed_days = (now - state.last_revised_at).total_seconds() / 86400.0
    if elapsed_days <= 0:
        return

    # Use the forgetting curve — but only if student has started the skill
    if state.review_count > 0:
        decayed = calculate_memory_strength(state.stability_factor, elapsed_days)
        # Blend: don't let it drop too fast from a recent quiz answer
        state.memory_strength = round(
            min(state.memory_strength, decayed + 0.1), 4   # +0.1 buffer
        )
        state.forgetting_risk = calculate_forgetting_risk(state.memory_strength)


# ---------------------------------------------------------------------------
# Get All Skill States for a User
# ---------------------------------------------------------------------------

def get_all_skill_states(
    user_id: str,
    db: Session,
) -> List[dict]:
    """
    Return all skill states for a user with real-time memory decay applied.
    Joins with skills table to include skill name.
    """
    now = datetime.now(timezone.utc)
    results = (
        db.query(UserSkillState, Skill)
        .join(Skill, UserSkillState.skill_id == Skill.id)
        .filter(UserSkillState.user_id == user_id)
        .all()
    )

    output = []
    for state, skill in results:
        # Apply real-time decay (don't persist, just for response)
        days_since = 0.0
        if state.last_revised_at:
            days_since = (now - state.last_revised_at).total_seconds() / 86400.0
        realtime_memory = calculate_memory_strength(state.stability_factor, days_since)
        realtime_risk = calculate_forgetting_risk(realtime_memory)

        output.append({
            "state": state,
            "skill": skill,
            "realtime_memory_strength": realtime_memory,
            "realtime_forgetting_risk": realtime_risk,
        })

    return output


# ---------------------------------------------------------------------------
# Dashboard Summary
# ---------------------------------------------------------------------------

def get_dashboard_summary(user_id: str, db: Session) -> dict:
    """Build aggregated learning dashboard data for a user."""
    now = datetime.now(timezone.utc)

    states_data = get_all_skill_states(user_id, db)

    total_skills = len(states_data)
    mastered_count = sum(1 for d in states_data if d["state"].is_mastered)
    in_progress = sum(
        1 for d in states_data
        if d["state"].is_unlocked and not d["state"].is_mastered and d["state"].total_attempts > 0
    )
    overall_mastery = (
        sum(d["state"].mastery_probability for d in states_data) / total_skills
        if total_skills > 0 else 0.0
    )

    # Today's study time (from sessions today)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == user_id,
            StudySession.started_at >= today_start,
            StudySession.duration_minutes.isnot(None),
        )
        .all()
    )
    study_minutes_today = sum(s.duration_minutes or 0 for s in today_sessions)

    return {
        "overall_mastery": round(overall_mastery, 4),
        "skills_mastered": mastered_count,
        "skills_in_progress": in_progress,
        "total_study_minutes_today": round(study_minutes_today, 1),
        "states_data": states_data,
    }
