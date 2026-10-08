"""
TESO — Weakness Detector Service
====================================
Identifies weak skills and predicts which topics a student will struggle with.

Phase 1: Multi-signal scoring heuristic (simulates XGBoost feature scoring).
Phase 3: Replace with trained XGBoostClassifier on attempt data.

Weakness score components (weights sum to 1.0):
  - accuracy_rate           (0.30) — % correct
  - forgetting_risk         (0.20) — current memory decay
  - wrong_streak            (0.15) — consecutive errors
  - confidence_deficit      (0.15) — 1 - confidence_score
  - response_time_penalty   (0.10) — slow responses
  - revision_gap_penalty    (0.10) — overdue for review
"""

from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.adaptive_models import UserSkillState, Skill
from app.services.spaced_repetition import calculate_memory_strength, calculate_forgetting_risk

# Weakness threshold — skills above this are considered weak
WEAKNESS_THRESHOLD = 0.45

# Critical weakness — needs immediate intervention
CRITICAL_THRESHOLD = 0.70

# Reference response time (ms) for penalty calculation
REFERENCE_RESPONSE_TIME_MS = 15_000


def _compute_accuracy_score(state: UserSkillState) -> float:
    """Accuracy rate over all attempts. Higher accuracy = lower weakness."""
    if state.total_attempts == 0:
        return 0.5  # Unknown — treat as mid-weakness
    return state.total_correct / state.total_attempts


def _compute_response_time_penalty(state: UserSkillState) -> float:
    """Normalize response time: 0 = fast (low weakness), 1 = very slow (high weakness)."""
    if state.avg_response_time_ms is None:
        return 0.0
    ratio = state.avg_response_time_ms / REFERENCE_RESPONSE_TIME_MS
    return min(1.0, max(0.0, (ratio - 1.0) / 2.0))  # penalty starts when >1x reference


def _compute_revision_gap_penalty(state: UserSkillState) -> float:
    """Penalty for being overdue for revision."""
    if state.next_revision_due is None:
        return 0.0
    now = datetime.now(timezone.utc)
    if state.next_revision_due >= now:
        return 0.0
    days_overdue = (now - state.next_revision_due).total_seconds() / 86400.0
    # 0 = on time, 1 = 7+ days overdue
    return min(1.0, days_overdue / 7.0)


def compute_weakness_score(state: UserSkillState) -> float:
    """
    Compute a composite weakness score [0, 1] for a skill.
    Higher = weaker.
    """
    now = datetime.now(timezone.utc)

    # Component 1: Accuracy (inverted — low accuracy = high weakness)
    accuracy_weakness = 1.0 - _compute_accuracy_score(state)

    # Component 2: Forgetting risk (real-time)
    days_since = 0.0
    if state.last_revised_at:
        days_since = (now - state.last_revised_at).total_seconds() / 86400.0
    memory = calculate_memory_strength(state.stability_factor, days_since)
    forgetting_risk = calculate_forgetting_risk(memory)

    # Component 3: Wrong streak (normalized to 0-1; 10+ consecutive = 1.0)
    wrong_streak_score = min(1.0, state.wrong_streak / 10.0)

    # Component 4: Confidence deficit
    confidence_deficit = 1.0 - state.confidence_score

    # Component 5: Response time penalty
    rt_penalty = _compute_response_time_penalty(state)

    # Component 6: Revision gap
    revision_gap = _compute_revision_gap_penalty(state)

    # Weighted sum
    weakness_score = (
        accuracy_weakness       * 0.30 +
        forgetting_risk         * 0.20 +
        wrong_streak_score      * 0.15 +
        confidence_deficit      * 0.15 +
        rt_penalty              * 0.10 +
        revision_gap            * 0.10
    )

    return round(min(1.0, max(0.0, weakness_score)), 4)


def detect_weak_skills(
    user_id: str,
    db: Session,
    limit: int = 10,
    min_attempts: int = 1,
) -> Dict[str, Any]:
    """
    Detect and rank weak skills for a user.
    
    Args:
        user_id: The student's user ID
        db: Database session
        limit: Max weak skills to return
        min_attempts: Minimum attempts before considering a skill
    
    Returns:
        Dict with weak skills list and summary stats.
    """
    states = (
        db.query(UserSkillState, Skill)
        .join(Skill, UserSkillState.skill_id == Skill.id)
        .filter(
            UserSkillState.user_id == user_id,
            UserSkillState.is_unlocked == True,
            UserSkillState.total_attempts >= min_attempts,
            UserSkillState.is_mastered == False,    # mastered skills aren't weak
        )
        .all()
    )

    weak_skills = []
    for state, skill in states:
        weakness = compute_weakness_score(state)
        if weakness < WEAKNESS_THRESHOLD:
            continue

        accuracy = _compute_accuracy_score(state)
        weak_skills.append({
            "skill_id": str(skill.id),
            "skill_name": skill.name,
            "weakness_score": weakness,
            "mastery_probability": state.mastery_probability,
            "accuracy_rate": round(accuracy, 4),
            "avg_response_time_ms": state.avg_response_time_ms,
            "wrong_streak": state.wrong_streak,
            "forgetting_risk": state.forgetting_risk,
            "recommended_action": _recommend_action(state, weakness),
            "suggested_focus_minutes": _suggest_focus_time(weakness),
        })

    # Sort by weakness score descending
    weak_skills.sort(key=lambda x: -x["weakness_score"])
    weak_skills = weak_skills[:limit]

    critical_count = sum(1 for w in weak_skills if w["weakness_score"] >= CRITICAL_THRESHOLD)

    return {
        "user_id": user_id,
        "weak_skills": weak_skills,
        "total_weak": len(weak_skills),
        "critical_count": critical_count,
    }


def _recommend_action(state: UserSkillState, weakness_score: float) -> str:
    """Recommend the best action for a weak skill."""
    if state.forgetting_risk > 0.7:
        return "revise_now"
    elif state.wrong_streak >= 3:
        return "mcq_practice"
    elif weakness_score >= CRITICAL_THRESHOLD:
        return "review_weak"
    else:
        return "mcq_practice"


def _suggest_focus_time(weakness_score: float) -> int:
    """Suggest focused study time in minutes based on weakness severity."""
    if weakness_score >= 0.80:
        return 60
    elif weakness_score >= 0.65:
        return 45
    elif weakness_score >= 0.50:
        return 30
    else:
        return 20
