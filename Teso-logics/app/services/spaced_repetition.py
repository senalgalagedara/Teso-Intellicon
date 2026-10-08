"""
TESO — Spaced Repetition Service
==================================
Implements Ebbinghaus-inspired forgetting curve and
SM-2-style adaptive interval scheduling for skill revision.

Memory model:
  R(t) = e^(-t / (S × stability_multiplier))
  where:
    t = elapsed days since last review
    S = stability_factor (increases with each successful review)

Interval schedule (after each review, based on performance):
  Perfect  (score ≥ 0.90): interval × 2.5, S × 1.3
  Good     (score ≥ 0.70): interval × 2.0, S × 1.1
  Okay     (score ≥ 0.50): interval × 1.3, S × 1.0
  Poor     (score < 0.50): reset to day 1, S × 0.8
"""

import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.adaptive_models import UserSkillState, Skill, RevisionLog

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Spaced repetition intervals (days)
BASE_INTERVALS = [1, 3, 7, 14, 30, 60, 90]

# Memory decay threshold — below this = "forgotten" (needs urgent review)
FORGETTING_THRESHOLD = 0.30

# Urgency revision threshold
URGENT_REVISION_THRESHOLD = 0.70

# Maximum interval cap
MAX_INTERVAL_DAYS = 90

# ---------------------------------------------------------------------------
# Core Memory Calculations
# ---------------------------------------------------------------------------

def calculate_memory_strength(
    stability_factor: float,
    days_since_last_review: float,
) -> float:
    """
    Calculate current memory retention using Ebbinghaus forgetting curve.
    
    R(t) = e^(-t / S)
    Returns value in [0.0, 1.0] where 1.0 = perfect retention.
    
    Args:
        stability_factor: S factor; higher = slower forgetting
        days_since_last_review: t; days elapsed since last review
    
    Returns:
        Current memory strength (retention).
    """
    if days_since_last_review <= 0 or stability_factor <= 0:
        return 1.0
    retention = math.exp(-days_since_last_review / max(stability_factor, 0.1))
    return round(max(0.0, min(1.0, retention)), 4)


def calculate_forgetting_risk(memory_strength: float) -> float:
    """
    Forgetting risk = 1 - memory_strength.
    Clamped to [0.0, 1.0].
    """
    return round(max(0.0, min(1.0, 1.0 - memory_strength)), 4)


def get_stability_multiplier(performance_score: float) -> float:
    """Return the stability adjustment multiplier based on quiz performance."""
    if performance_score >= 0.90:
        return 1.30   # Strong performance: stability grows fast
    elif performance_score >= 0.70:
        return 1.10   # Good performance
    elif performance_score >= 0.50:
        return 1.00   # Marginal: stability unchanged
    else:
        return 0.80   # Poor: stability weakens


def get_interval_multiplier(performance_score: float) -> float:
    """Return the interval extension multiplier based on quiz performance."""
    if performance_score >= 0.90:
        return 2.5
    elif performance_score >= 0.70:
        return 2.0
    elif performance_score >= 0.50:
        return 1.3
    else:
        return 0.0   # Reset to day 1


def calculate_next_review(
    current_interval_days: int,
    stability_factor: float,
    performance_score: float,
    review_count: int,
) -> tuple[datetime, int, float]:
    """
    Given the current state and a performance score, compute:
      - next_revision_due  (datetime)
      - new_interval_days  (int)
      - new_stability_factor  (float)
    
    Returns (next_due, new_interval, new_stability).
    """
    multiplier = get_interval_multiplier(performance_score)
    stab_multiplier = get_stability_multiplier(performance_score)

    if multiplier == 0.0:
        # Poor performance → reset
        new_interval = BASE_INTERVALS[0]   # 1 day
        new_stability = max(0.5, stability_factor * stab_multiplier)
    else:
        # Advance interval
        new_interval = min(
            int(current_interval_days * multiplier),
            MAX_INTERVAL_DAYS
        )
        # Ensure at least one step forward
        new_interval = max(new_interval, current_interval_days + 1)
        new_stability = max(0.5, stability_factor * stab_multiplier)

    next_due = datetime.now(timezone.utc) + timedelta(days=new_interval)
    return next_due, new_interval, round(new_stability, 4)


# ---------------------------------------------------------------------------
# Revision Queue
# ---------------------------------------------------------------------------

def get_revision_queue(
    user_id: str,
    db: Session,
    max_items: int = 10,
) -> List[dict]:
    """
    Return list of skills that are due (or overdue) for revision,
    sorted by urgency (highest forgetting risk first).
    
    Each item contains the skill state + computed priority.
    """
    now = datetime.now(timezone.utc)
    states = (
        db.query(UserSkillState, Skill)
        .join(Skill, UserSkillState.skill_id == Skill.id)
        .filter(
            UserSkillState.user_id == user_id,
            UserSkillState.is_unlocked == True,
            UserSkillState.review_count > 0,           # must have been reviewed at least once
        )
        .all()
    )

    queue = []
    for state, skill in states:
        # Recalculate current memory strength in real time
        days_since = 0.0
        if state.last_revised_at:
            elapsed = now - state.last_revised_at
            days_since = elapsed.total_seconds() / 86400.0

        current_memory = calculate_memory_strength(
            state.stability_factor,
            days_since,
        )
        forgetting_risk = calculate_forgetting_risk(current_memory)

        # Determine if due
        is_overdue = (
            state.next_revision_due is not None
            and state.next_revision_due <= now
        )
        is_high_risk = forgetting_risk >= URGENT_REVISION_THRESHOLD

        if not (is_overdue or is_high_risk):
            continue

        # Days overdue
        days_overdue = 0
        if state.next_revision_due and state.next_revision_due < now:
            days_overdue = int((now - state.next_revision_due).total_seconds() / 86400)

        queue.append({
            "skill_id": str(skill.id),
            "skill_name": skill.name,
            "forgetting_risk": forgetting_risk,
            "memory_strength": current_memory,
            "mastery_probability": state.mastery_probability,
            "days_overdue": days_overdue,
            "last_revised_at": state.last_revised_at,
            "is_overdue": is_overdue,
            "suggested_duration_minutes": _suggest_duration(state, skill),
        })

    # Sort: overdue first, then by forgetting_risk descending
    queue.sort(key=lambda x: (-int(x["is_overdue"]), -x["forgetting_risk"]))

    # Add priority rank
    for i, item in enumerate(queue[:max_items]):
        item["priority"] = i + 1

    return queue[:max_items]


def _suggest_duration(state: UserSkillState, skill: Skill) -> int:
    """Suggest a revision session length in minutes based on mastery level."""
    if state.mastery_probability < 0.3:
        return 45
    elif state.mastery_probability < 0.6:
        return 30
    elif state.mastery_probability < 0.8:
        return 20
    else:
        return 10


# ---------------------------------------------------------------------------
# Apply Revision
# ---------------------------------------------------------------------------

def apply_revision(
    user_id: str,
    skill_id: str,
    performance_score: float,
    duration_minutes: float,
    db: Session,
    confidence_rating: Optional[int] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Record a completed revision session:
    1. Log to revision_logs
    2. Update user_skill_state (memory_strength, next_revision_due, etc.)
    3. Return before/after state summary.
    """
    state = (
        db.query(UserSkillState)
        .filter(
            UserSkillState.user_id == user_id,
            UserSkillState.skill_id == skill_id,
        )
        .first()
    )
    if not state:
        raise ValueError(f"No skill state found for user={user_id}, skill={skill_id}")

    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    now = datetime.now(timezone.utc)

    # --- Compute before state ---
    days_since = 0.0
    if state.last_revised_at:
        elapsed = now - state.last_revised_at
        days_since = elapsed.total_seconds() / 86400.0

    memory_before = calculate_memory_strength(state.stability_factor, days_since)

    # --- Compute new spaced rep parameters ---
    next_due, new_interval, new_stability = calculate_next_review(
        state.current_interval_days,
        state.stability_factor,
        performance_score,
        state.review_count,
    )

    # Memory strength after revision: blends performance into new retention
    # Immediate post-revision memory = performance_score (resets curve)
    memory_after = round(min(1.0, 0.6 + performance_score * 0.4), 4)

    # Confidence update (blend self-rating if provided)
    if confidence_rating is not None:
        conf_from_rating = (confidence_rating - 1) / 4.0   # 1-5 → 0-1
        state.confidence_score = round(
            state.confidence_score * 0.6 + conf_from_rating * 0.4, 4
        )

    # --- Log revision ---
    revision_log = RevisionLog(
        user_id=user_id,
        skill_id=skill_id,
        revised_at=now,
        performance_score=performance_score,
        duration_minutes=duration_minutes,
        memory_strength_before=memory_before,
        memory_strength_after=memory_after,
        interval_days=new_interval,
        notes=notes,
    )
    db.add(revision_log)

    # --- Update skill state ---
    state.memory_strength = memory_after
    state.stability_factor = new_stability
    state.forgetting_risk = calculate_forgetting_risk(memory_after)
    state.retention_score = round(
        state.retention_score * 0.7 + performance_score * 0.3, 4
    )
    state.review_count += 1
    state.current_interval_days = new_interval
    state.next_revision_due = next_due
    state.last_revised_at = now
    state.last_activity = now

    db.commit()

    skill_name = skill.name if skill else "Unknown"
    return {
        "skill_id": skill_id,
        "skill_name": skill_name,
        "memory_strength_before": memory_before,
        "memory_strength_after": memory_after,
        "mastery_probability": state.mastery_probability,
        "next_revision_due": next_due,
        "interval_days": new_interval,
        "message": f"Revision recorded. Next review in {new_interval} days.",
    }
