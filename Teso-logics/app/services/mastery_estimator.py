"""
TESO — Mastery Estimator Service
===================================
Estimates a student's mastery probability for a given skill using a
rule-based Bayesian Knowledge Tracing (BKT) approximation.

Phase 1: Rule-based heuristics simulating BKT behaviour.
Phase 3: Replace with pyBKT (pip install pyBKT).

BKT model parameters (Phase 1 defaults):
  P(L₀)  = 0.10   prior probability of knowing the skill
  P(T)   = 0.30   probability of learning (transition) per opportunity
  P(G)   = 0.25   probability of guessing correctly (not knowing)
  P(S)   = 0.10   probability of slipping (knowing but wrong)

Mastery threshold: 0.85 → skill is considered mastered
"""

from typing import List, Optional
import math
from sqlalchemy.orm import Session

from app.models.adaptive_models import UserSkillState, QuizAttempt, Skill

# ---------------------------------------------------------------------------
# BKT Parameters (configurable per skill in Phase 3)
# ---------------------------------------------------------------------------

DEFAULT_P_PRIOR = 0.10     # P(L₀)
DEFAULT_P_TRANSIT = 0.30   # P(T) — probability of learning per attempt
DEFAULT_P_GUESS = 0.25     # P(G) — guessing probability
DEFAULT_P_SLIP = 0.10      # P(S) — slip probability
MASTERY_THRESHOLD = 0.85   # above this → skill is mastered


# ---------------------------------------------------------------------------
# Core BKT Approximation
# ---------------------------------------------------------------------------

def bkt_update(
    p_mastery: float,
    is_correct: bool,
    p_transit: float = DEFAULT_P_TRANSIT,
    p_guess: float = DEFAULT_P_GUESS,
    p_slip: float = DEFAULT_P_SLIP,
) -> float:
    """
    One-step Bayesian Knowledge Tracing update.
    
    Given prior mastery probability P(Lₙ) and an observation (correct/wrong),
    compute posterior P(Lₙ₊₁).
    
    Formulas:
      P(correct | Lₙ) = P(Lₙ)·(1−P(S)) + (1−P(Lₙ))·P(G)
      P(Lₙ | correct) = [P(Lₙ)·(1−P(S))] / P(correct | Lₙ)
      P(Lₙ₊₁) = P(Lₙ|obs) + (1 − P(Lₙ|obs)) · P(T)
    
    Args:
        p_mastery: Current mastery probability [0, 1]
        is_correct: Whether the student answered correctly
        p_transit, p_guess, p_slip: BKT parameters
    
    Returns:
        Updated mastery probability [0, 1]
    """
    p_mastery = max(0.0, min(1.0, p_mastery))

    # P(Evidence | Lₙ)
    if is_correct:
        p_evidence = p_mastery * (1 - p_slip) + (1 - p_mastery) * p_guess
    else:
        p_evidence = p_mastery * p_slip + (1 - p_mastery) * (1 - p_guess)

    # Avoid division by zero
    if p_evidence <= 0.001:
        p_evidence = 0.001

    # P(Lₙ | evidence)
    if is_correct:
        p_known_given_evidence = (p_mastery * (1 - p_slip)) / p_evidence
    else:
        p_known_given_evidence = (p_mastery * p_slip) / p_evidence

    # P(Lₙ₊₁) — apply transition (chance of learning if not already known)
    p_next = p_known_given_evidence + (1 - p_known_given_evidence) * p_transit

    return round(max(0.0, min(1.0, p_next)), 4)


def confidence_boost(mastery: float, confidence_score: float) -> float:
    """
    Blend confidence signal into mastery estimate.
    High confidence slightly boosts mastery; low confidence pulls it down.
    Weight: 80% BKT, 20% confidence.
    """
    blended = mastery * 0.80 + confidence_score * 0.20
    return round(max(0.0, min(1.0, blended)), 4)


def response_time_penalty(
    mastery: float,
    avg_response_time_ms: Optional[float],
    expected_time_ms: float = 15_000,
) -> float:
    """
    Apply a small penalty if response times are much longer than expected.
    Students who take too long may have lower actual mastery than BKT suggests.
    """
    if avg_response_time_ms is None:
        return mastery
    ratio = avg_response_time_ms / expected_time_ms
    if ratio > 2.0:
        # Very slow — apply up to 5% penalty
        penalty = min(0.05, (ratio - 2.0) * 0.02)
        mastery = max(0.0, mastery - penalty)
    return round(mastery, 4)


# ---------------------------------------------------------------------------
# Full Mastery Estimation (from stored state + new evidence)
# ---------------------------------------------------------------------------

def estimate_mastery_from_attempts(
    current_mastery: float,
    recent_attempts: List[dict],
    confidence_score: float = 0.5,
    avg_response_time_ms: Optional[float] = None,
) -> float:
    """
    Run BKT updates over a list of recent attempt records and
    apply confidence + response time adjustments.
    
    Args:
        current_mastery: Starting mastery probability
        recent_attempts: List of dicts with 'is_correct' and optional 'confidence_rating'
        confidence_score: Current blended confidence score
        avg_response_time_ms: Average response time for adjustment
    
    Returns:
        Updated mastery probability.
    """
    mastery = current_mastery
    for attempt in recent_attempts:
        mastery = bkt_update(mastery, attempt["is_correct"])

    # Apply confidence blend
    mastery = confidence_boost(mastery, confidence_score)

    # Apply response time penalty
    mastery = response_time_penalty(mastery, avg_response_time_ms)

    return mastery


# ---------------------------------------------------------------------------
# Database-Backed Update
# ---------------------------------------------------------------------------

def update_mastery_after_quiz(
    user_id: str,
    skill_id: str,
    is_correct: bool,
    confidence_rating: Optional[int],
    response_time_ms: Optional[int],
    db: Session,
) -> UserSkillState:
    """
    Update the stored mastery probability in user_skill_state after a
    single quiz attempt using BKT + confidence + response time.
    
    Args:
        user_id, skill_id: Identifiers
        is_correct: Whether the attempt was correct
        confidence_rating: Optional 1-5 self-rating
        response_time_ms: Response time in milliseconds
        db: Database session
    
    Returns:
        Updated UserSkillState.
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
        # First interaction — create state with prior
        state = UserSkillState(
            user_id=user_id,
            skill_id=skill_id,
            mastery_probability=DEFAULT_P_PRIOR,
            stability_factor=1.0,
            is_unlocked=True,
        )
        db.add(state)
        db.flush()

    # Update BKT mastery
    new_mastery = bkt_update(state.mastery_probability, is_correct)

    # Update confidence score
    if confidence_rating is not None:
        conf_normalized = (confidence_rating - 1) / 4.0   # 1-5 → 0.0-1.0
        new_confidence = state.confidence_score * 0.65 + conf_normalized * 0.35
        state.confidence_score = round(max(0.0, min(1.0, new_confidence)), 4)

    # Blend confidence into mastery
    new_mastery = confidence_boost(new_mastery, state.confidence_score)

    # Apply response time adjustment
    if response_time_ms is not None:
        # Update rolling average
        if state.avg_response_time_ms:
            n = min(state.total_attempts, 10)  # rolling window
            state.avg_response_time_ms = round(
                (state.avg_response_time_ms * n + response_time_ms) / (n + 1), 2
            )
        else:
            state.avg_response_time_ms = float(response_time_ms)

        new_mastery = response_time_penalty(new_mastery, state.avg_response_time_ms)

    # Update counts
    state.total_attempts += 1
    if is_correct:
        state.total_correct += 1
        state.correct_streak += 1
        state.wrong_streak = 0
    else:
        state.wrong_streak += 1
        state.correct_streak = 0

    # Update mastery
    state.mastery_probability = new_mastery
    state.is_mastered = new_mastery >= MASTERY_THRESHOLD

    # Update difficulty level recommendation
    state.difficulty_level = _recommend_difficulty(new_mastery)

    # Update last quiz score (accuracy of recent attempt)
    state.last_quiz_score = 1.0 if is_correct else 0.0

    return state


def _recommend_difficulty(mastery: float) -> str:
    """Recommend question difficulty based on current mastery."""
    if mastery < 0.3:
        return "easy"
    elif mastery < 0.6:
        return "medium"
    elif mastery < 0.8:
        return "hard"
    else:
        return "expert"
