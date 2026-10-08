"""
TESO — Adaptive Quiz Engine
==============================
Generates calibrated quiz sessions based on a student's current ability level.

Phase 1: Selects questions by difficulty quartile relative to mastery.
Phase 3: Replace selection with IRT (Item Response Theory) using py-irt.

Question selection strategy:
  - Target difficulty = f(mastery_probability)
  - Mix: 60% target difficulty, 20% easier, 20% harder
  - Never repeat recently answered questions (within 7 days)
  - Prioritise questions from weak skills
  - Shuffle options to prevent pattern learning
"""

import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
from sqlalchemy.orm import Session

from app.models.adaptive_models import (
    Question, UserSkillState, Skill, QuizAttempt
)
from app.services.mastery_estimator import update_mastery_after_quiz
from app.services.spaced_repetition import calculate_memory_strength, calculate_forgetting_risk
from app.services.event_tracker import track_event

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RECENT_QUESTION_WINDOW_DAYS = 7    # don't repeat questions seen in this window
DEFAULT_QUIZ_SIZE = 10
MAX_QUIZ_SIZE = 20


# ---------------------------------------------------------------------------
# Difficulty Targeting
# ---------------------------------------------------------------------------

def _mastery_to_target_difficulty(mastery: float) -> float:
    """
    Map mastery probability to target question difficulty score.
    
    Vygotsky Zone of Proximal Development:
      Slightly harder than current mastery = optimal learning zone.
    """
    # Target is mastery + 0.15 (stretch), capped at 0.95
    return min(0.95, mastery + 0.15)


def _difficulty_range(target: float, band: str) -> tuple[float, float]:
    """Return the difficulty score range for easy/target/hard bands."""
    half_width = 0.20
    if band == "easy":
        lo = max(0.0, target - 0.40)
        hi = max(0.0, target - 0.15)
    elif band == "hard":
        lo = min(1.0, target + 0.15)
        hi = min(1.0, target + 0.40)
    else:   # target band
        lo = max(0.0, target - half_width)
        hi = min(1.0, target + half_width)
    return lo, hi


# ---------------------------------------------------------------------------
# Recently Seen Questions Filter
# ---------------------------------------------------------------------------

def _get_recently_seen_ids(user_id: str, skill_ids: List[str], db: Session) -> set:
    """Get question IDs seen by this user in the last 7 days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_QUESTION_WINDOW_DAYS)
    recent = (
        db.query(QuizAttempt.question_id)
        .filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.attempted_at >= cutoff,
            QuizAttempt.skill_id.in_(skill_ids),
        )
        .all()
    )
    return {str(r[0]) for r in recent}


# ---------------------------------------------------------------------------
# Question Selection
# ---------------------------------------------------------------------------

def select_questions_for_skill(
    user_id: str,
    skill_id: str,
    db: Session,
    count: int = 5,
    recently_seen: set = None,
) -> List[Question]:
    """
    Select `count` questions for a skill, calibrated to the student's mastery.
    Mix: 60% target difficulty, 20% easier, 20% harder.
    """
    recently_seen = recently_seen or set()

    # Get mastery
    state = (
        db.query(UserSkillState)
        .filter(
            UserSkillState.user_id == user_id,
            UserSkillState.skill_id == skill_id,
        )
        .first()
    )
    mastery = state.mastery_probability if state else 0.1
    target_diff = _mastery_to_target_difficulty(mastery)

    def fetch_band(band: str, n: int) -> List[Question]:
        lo, hi = _difficulty_range(target_diff, band)
        qs = (
            db.query(Question)
            .filter(
                Question.skill_id == skill_id,
                Question.is_active == True,
                Question.difficulty_score >= lo,
                Question.difficulty_score <= hi,
                ~Question.id.in_([uuid.UUID(sid) for sid in recently_seen if sid]),
            )
            .all()
        )
        random.shuffle(qs)
        return qs[:n]

    # Allocate slots
    n_target = max(1, round(count * 0.60))
    n_easy = max(0, round(count * 0.20))
    n_hard = count - n_target - n_easy

    selected = []
    selected += fetch_band("target", n_target)
    selected += fetch_band("easy", n_easy)
    selected += fetch_band("hard", n_hard)

    # If we didn't get enough, fill with any available questions
    if len(selected) < count:
        existing_ids = {str(q.id) for q in selected}
        extras = (
            db.query(Question)
            .filter(
                Question.skill_id == skill_id,
                Question.is_active == True,
                ~Question.id.in_([uuid.UUID(sid) for sid in recently_seen | existing_ids if sid]),
            )
            .limit(count - len(selected))
            .all()
        )
        selected += extras

    random.shuffle(selected)
    return selected[:count]


# ---------------------------------------------------------------------------
# Multi-Skill Adaptive Quiz
# ---------------------------------------------------------------------------

def generate_adaptive_quiz(
    user_id: str,
    skill_ids: List[str],
    db: Session,
    total_questions: int = DEFAULT_QUIZ_SIZE,
) -> dict:
    """
    Generate an adaptive quiz across multiple skills.
    Allocates more questions to weaker/more urgent skills.
    
    Returns dict with quiz_id, questions list, metadata.
    """
    if not skill_ids:
        raise ValueError("At least one skill_id must be provided")
    total_questions = min(total_questions, MAX_QUIZ_SIZE)

    recently_seen = _get_recently_seen_ids(user_id, skill_ids, db)

    # Get states to compute urgency weighting
    states = (
        db.query(UserSkillState)
        .filter(
            UserSkillState.user_id == user_id,
            UserSkillState.skill_id.in_(skill_ids),
        )
        .all()
    )
    state_map: Dict[str, UserSkillState] = {str(s.skill_id): s for s in states}

    # Weight each skill by weakness (low mastery + high forgetting = more questions)
    now = datetime.now(timezone.utc)
    weights: Dict[str, float] = {}
    for sid in skill_ids:
        state = state_map.get(sid)
        if state is None:
            weights[sid] = 1.0
            continue
        days_since = 0.0
        if state.last_revised_at:
            days_since = (now - state.last_revised_at).total_seconds() / 86400.0
        mem = calculate_memory_strength(state.stability_factor, days_since)
        risk = calculate_forgetting_risk(mem)
        # More questions → lower mastery + higher risk
        weakness = (1.0 - state.mastery_probability) * 0.6 + risk * 0.4
        weights[sid] = max(0.1, weakness)

    total_weight = sum(weights.values())
    all_questions = []

    for sid in skill_ids:
        proportion = weights[sid] / total_weight
        n = max(1, round(total_questions * proportion))
        qs = select_questions_for_skill(user_id, sid, db, count=n, recently_seen=recently_seen)
        all_questions.extend(qs)

    # Trim or fill to exactly total_questions
    random.shuffle(all_questions)
    all_questions = all_questions[:total_questions]

    # Compute calibrated difficulty (weighted average of selected questions)
    if all_questions:
        avg_diff = sum(q.difficulty_score for q in all_questions) / len(all_questions)
    else:
        avg_diff = 0.5

    estimated_minutes = sum(q.time_limit_seconds for q in all_questions) / 60.0

    # Get skill names
    skills = db.query(Skill).filter(Skill.id.in_(skill_ids)).all()
    skill_name_map = {str(s.id): s.name for s in skills}

    quiz_id = str(uuid.uuid4())
    return {
        "quiz_id": quiz_id,
        "skill_ids": skill_ids,
        "questions": all_questions,
        "skill_name_map": skill_name_map,
        "calibrated_difficulty": round(avg_diff, 4),
        "estimated_duration_minutes": round(estimated_minutes, 1),
        "generated_at": now,
    }


# ---------------------------------------------------------------------------
# Submit Quiz — Process Answers
# ---------------------------------------------------------------------------

def process_quiz_submission(
    user_id: str,
    answers: List[dict],
    db: Session,
    session_id: Optional[str] = None,
) -> dict:
    """
    Process submitted quiz answers:
    1. Record each QuizAttempt
    2. Update mastery via BKT for each skill
    3. Update question statistics
    4. Track events
    5. Return summary + updated states
    
    Args:
        user_id: Student user ID
        answers: List of answer dicts (question_id, skill_id, selected_answer, response_time_ms, ...)
        db: Database session
        session_id: Optional session ID
    
    Returns:
        Quiz result summary with skill updates.
    """
    correct_count = 0
    total_response_time = 0
    skill_updates: Dict[str, UserSkillState] = {}
    achievements = []

    for answer in answers:
        question = db.query(Question).filter(
            Question.id == answer["question_id"]
        ).first()
        if not question:
            continue

        selected = answer.get("selected_answer")
        is_correct = selected == question.correct_answer if selected else False
        response_time_ms = answer.get("response_time_ms", 0)
        confidence_rating = answer.get("confidence_rating")
        hint_used = answer.get("hint_used", False)

        if is_correct:
            correct_count += 1
        total_response_time += response_time_ms

        # Record attempt
        attempt = QuizAttempt(
            user_id=user_id,
            session_id=session_id,
            question_id=answer["question_id"],
            skill_id=answer["skill_id"],
            selected_answer=selected,
            is_correct=is_correct,
            response_time_ms=response_time_ms,
            confidence_rating=confidence_rating,
            retry_count=answer.get("retry_count", 0),
            hint_used=hint_used,
        )
        db.add(attempt)

        # Update question stats
        question.total_attempts += 1
        if is_correct:
            question.total_correct += 1

        # BKT mastery update
        updated_state = update_mastery_after_quiz(
            user_id=user_id,
            skill_id=answer["skill_id"],
            is_correct=is_correct,
            confidence_rating=confidence_rating,
            response_time_ms=response_time_ms,
            db=db,
        )
        skill_updates[answer["skill_id"]] = updated_state

        # Track event
        track_event(
            user_id=user_id,
            event_type="quiz_answered",
            skill_id=answer["skill_id"],
            question_id=answer["question_id"],
            session_id=session_id,
            db=db,
            payload={
                "is_correct": is_correct,
                "response_time_ms": response_time_ms,
                "confidence_rating": confidence_rating,
            }
        )

    db.commit()

    total = len(answers)
    score = correct_count / total if total > 0 else 0.0
    avg_rt = total_response_time / total if total > 0 else 0.0

    # Achievement checks
    if score >= 1.0:
        achievements.append("🏆 Perfect Score!")
    elif score >= 0.8:
        achievements.append("⭐ Excellent Performance!")
    if total >= 10 and score >= 0.7:
        achievements.append("📚 Solid Quiz Session!")

    # Get skill names for updates
    updated_states_list = list(skill_updates.values())

    return {
        "total_questions": total,
        "correct_count": correct_count,
        "score": round(score, 4),
        "avg_response_time_ms": round(avg_rt, 1),
        "skill_updates": updated_states_list,
        "achievements": achievements,
        "message": f"Quiz complete! Score: {correct_count}/{total} ({score*100:.0f}%)",
    }
