"""
TESO — Adaptive Recommender Service
======================================
The observe → estimate → predict → adapt feedback loop.

Generates the "next best action" for each student based on their
continuously updated learning state. This is the core intelligence
that personalizes the learning experience.

Decision hierarchy (priority order):
  1. Critical burnout risk → take_break (EMERGENCY)
  2. Skills overdue for revision with high forgetting risk → revise_now
  3. Critical weak skills with wrong streaks → review_weak / mcq_practice
  4. Moderate burnout → suggest shorter session
  5. Mastered skills available to unlock next → new_lesson
  6. Default: practice most neglected in-progress skill
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.adaptive_models import UserSkillState, Skill, DailyPlan
from app.services.burnout_predictor import predict_burnout
from app.services.spaced_repetition import get_revision_queue
from app.services.weakness_detector import detect_weak_skills, CRITICAL_THRESHOLD
from app.services.skill_graph import get_unlocked_skills

# ---------------------------------------------------------------------------
# Recommendation Builder
# ---------------------------------------------------------------------------

def _make_recommendation(
    action_type: str,
    reason: str,
    urgency: float,
    skill_id: Optional[str] = None,
    skill_name: Optional[str] = None,
    duration_minutes: Optional[int] = None,
    supporting_data: Dict[str, Any] = None,
) -> dict:
    return {
        "action_type": action_type,
        "skill_id": skill_id,
        "skill_name": skill_name,
        "reason": reason,
        "urgency": round(max(0.0, min(1.0, urgency)), 3),
        "estimated_duration_minutes": duration_minutes,
        "supporting_data": supporting_data or {},
    }


# ---------------------------------------------------------------------------
# Core Recommendation Engine
# ---------------------------------------------------------------------------

def get_recommendations(user_id: str, db: Session) -> dict:
    """
    Generate a prioritized list of recommended learning actions.
    
    Implements the full observe → estimate → predict → adapt loop:
      OBSERVE:  collect current learning state signals
      ESTIMATE: compute urgency for each possible action
      PREDICT:  rank actions by value (urgency × learning impact)
      ADAPT:    return top recommendations with explanations
    
    Returns dict with recommendations list and primary_action.
    """
    now = datetime.now(timezone.utc)
    recommendations = []

    # === OBSERVE ===

    # 1. Burnout state
    burnout = predict_burnout(user_id, db)
    burnout_risk = burnout["burnout_risk"]

    # 2. Revision queue (forgetting curve — overdue skills)
    revision_queue = get_revision_queue(user_id, db, max_items=5)

    # 3. Weak skills
    weak_data = detect_weak_skills(user_id, db, limit=5, min_attempts=1)
    weak_skills = weak_data.get("weak_skills", [])

    # 4. Unlocked skills (ready to learn next)
    unlocked = get_unlocked_skills(user_id, db)

    # === ESTIMATE & PREDICT ===

    # --- Priority 1: Critical burnout ---
    if burnout_risk >= 0.80:
        recommendations.append(_make_recommendation(
            action_type="take_break",
            reason=f"🚨 Critical burnout risk ({burnout_risk:.0%}). Rest is essential for memory consolidation.",
            urgency=1.0,
            duration_minutes=None,
            supporting_data={"burnout_risk": burnout_risk, "factors": burnout["contributing_factors"]},
        ))

    # --- Priority 2: High forgetting risk revisions ---
    for item in revision_queue:
        if item["forgetting_risk"] >= 0.70:
            urgency = min(1.0, 0.6 + item["days_overdue"] * 0.05 + item["forgetting_risk"] * 0.3)
            recommendations.append(_make_recommendation(
                action_type="revise_now",
                skill_id=item["skill_id"],
                skill_name=item["skill_name"],
                reason=f"Memory is decaying fast ({item['forgetting_risk']:.0%} forgetting risk). Quick review now will save hours later.",
                urgency=urgency,
                duration_minutes=item["suggested_duration_minutes"],
                supporting_data={
                    "forgetting_risk": item["forgetting_risk"],
                    "memory_strength": item["memory_strength"],
                    "days_overdue": item["days_overdue"],
                },
            ))

    # --- Priority 3: Critical weak skills ---
    for weak in weak_skills:
        if weak["weakness_score"] >= CRITICAL_THRESHOLD:
            urgency = min(0.95, weak["weakness_score"])
            action = weak["recommended_action"]
            if weak["wrong_streak"] >= 5:
                reason = f"You've answered {weak['wrong_streak']} questions in a row incorrectly. Let's fix this gap now."
            else:
                reason = f"Low accuracy ({weak['accuracy_rate']:.0%}) on this topic. Targeted practice will significantly boost your exam score."
            recommendations.append(_make_recommendation(
                action_type=action,
                skill_id=weak["skill_id"],
                skill_name=weak["skill_name"],
                reason=reason,
                urgency=urgency,
                duration_minutes=weak["suggested_focus_minutes"],
                supporting_data={
                    "weakness_score": weak["weakness_score"],
                    "accuracy_rate": weak["accuracy_rate"],
                    "wrong_streak": weak["wrong_streak"],
                },
            ))

    # --- Priority 4: Moderate burnout warning ---
    if 0.45 <= burnout_risk < 0.80 and not any(r["action_type"] == "take_break" for r in recommendations):
        recommendations.append(_make_recommendation(
            action_type="take_break",
            reason=f"Moderate burnout risk detected ({burnout_risk:.0%}). Consider taking a 15-minute break before your next session.",
            urgency=burnout_risk * 0.8,
            duration_minutes=15,
            supporting_data={"burnout_risk": burnout_risk},
        ))

    # --- Priority 5: Regular revision queue ---
    for item in revision_queue:
        if item["forgetting_risk"] < 0.70:   # already handled high risk above
            urgency = 0.3 + item["forgetting_risk"] * 0.3
            recommendations.append(_make_recommendation(
                action_type="revise_now",
                skill_id=item["skill_id"],
                skill_name=item["skill_name"],
                reason=f"Scheduled revision due. Memory strength: {item['memory_strength']:.0%}.",
                urgency=urgency,
                duration_minutes=item["suggested_duration_minutes"],
                supporting_data={"memory_strength": item["memory_strength"]},
            ))

    # --- Priority 6: Moderate weak skills (MCQ practice) ---
    for weak in weak_skills:
        if weak["weakness_score"] < CRITICAL_THRESHOLD:
            recommendations.append(_make_recommendation(
                action_type="mcq_practice",
                skill_id=weak["skill_id"],
                skill_name=weak["skill_name"],
                reason=f"Extra practice on this topic will help. Current accuracy: {weak['accuracy_rate']:.0%}.",
                urgency=weak["weakness_score"] * 0.7,
                duration_minutes=20,
                supporting_data={"weakness_score": weak["weakness_score"]},
            ))

    # --- Priority 7: New lesson (skill progression) ---
    # Find skills student hasn't started yet but can unlock
    not_started = [
        n for n in unlocked
        if n["state"] is None or (n["state"] and n["state"].total_attempts == 0)
    ] if isinstance(unlocked, list) and unlocked and isinstance(unlocked[0], dict) and "state" in unlocked[0] else []

    if not not_started:
        # Simplified: get unlocked skills from graph data
        for n in (unlocked or [])[:3]:
            skill = n.get("skill") if isinstance(n, dict) else n
            if skill is None:
                continue
            skill_id = str(skill.id) if hasattr(skill, 'id') else None
            recommendations.append(_make_recommendation(
                action_type="new_lesson",
                skill_id=skill_id,
                skill_name=skill.name if hasattr(skill, 'name') else "Next Topic",
                reason="Prerequisites mastered! Ready to explore a new topic.",
                urgency=0.3,
                duration_minutes=45,
            ))

    # === ADAPT: Sort and cap ===
    recommendations.sort(key=lambda r: -r["urgency"])

    # Remove duplicates (same skill+action)
    seen = set()
    unique_recs = []
    for rec in recommendations:
        key = (rec["action_type"], rec.get("skill_id"))
        if key not in seen:
            seen.add(key)
            unique_recs.append(rec)

    unique_recs = unique_recs[:8]   # Return top 8

    # Primary action
    primary = unique_recs[0] if unique_recs else _make_recommendation(
        action_type="mcq_practice",
        reason="Keep up the momentum! Practice a few questions to reinforce your knowledge.",
        urgency=0.3,
        duration_minutes=15,
    )

    return {
        "user_id": user_id,
        "recommendations": unique_recs,
        "primary_action": primary,
        "generated_at": now,
    }


# ---------------------------------------------------------------------------
# Daily Plan Generator
# ---------------------------------------------------------------------------

def generate_daily_plan(
    user_id: str,
    db: Session,
    available_minutes: Optional[int] = None,
    force_regenerate: bool = False,
) -> dict:
    """
    Generate a day's study plan based on:
      - Revision queue (spaced rep due items)
      - Weak skill practice
      - New lesson progression
      - Burnout-adjusted workload
    
    Returns a DailyPlan dict with ordered items.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Check for existing plan today
    if not force_regenerate:
        existing = (
            db.query(DailyPlan)
            .filter(
                DailyPlan.user_id == user_id,
                DailyPlan.plan_date >= today_start,
            )
            .first()
        )
        if existing:
            return _format_existing_plan(existing, db)

    # Get recommendations (our decision engine)
    recs = get_recommendations(user_id, db)

    # Get burnout state
    burnout = predict_burnout(user_id, db)
    burnout_adjusted = burnout["burnout_risk"] >= 0.45

    # Determine available time
    if available_minutes is None:
        suggested_hours = burnout.get("suggested_daily_hours", 6.0)
        available_minutes = int(suggested_hours * 60)

    plan_items = []
    time_used = 0

    for rec in recs["recommendations"]:
        if rec["action_type"] == "take_break":
            continue  # don't schedule breaks as plan items; mention in recommendations
        duration = rec.get("estimated_duration_minutes") or 20
        if time_used + duration > available_minutes:
            break

        # Get skill name
        skill_name = rec.get("skill_name") or "General Practice"
        mastery = 0.0
        forgetting_risk = 0.0

        if rec.get("skill_id"):
            state = (
                db.query(UserSkillState)
                .filter(
                    UserSkillState.user_id == user_id,
                    UserSkillState.skill_id == rec["skill_id"],
                )
                .first()
            )
            if state:
                mastery = state.mastery_probability
                forgetting_risk = state.forgetting_risk

        plan_items.append({
            "skill_id": rec.get("skill_id", ""),
            "skill_name": skill_name,
            "action_type": rec["action_type"],
            "duration_minutes": duration,
            "priority": len(plan_items) + 1,
            "mastery": round(mastery, 4),
            "forgetting_risk": round(forgetting_risk, 4),
            "reason": rec["reason"],
        })
        time_used += duration

    total_planned = sum(item["duration_minutes"] for item in plan_items)

    # Persist to DB
    daily_plan = DailyPlan(
        user_id=user_id,
        plan_date=now,
        planned_items=plan_items,
        total_planned_minutes=total_planned,
        burnout_adjusted=burnout_adjusted,
        generated_by="rule_engine",
        status="active",
    )
    db.add(daily_plan)
    db.commit()
    db.refresh(daily_plan)

    return {
        "plan_id": str(daily_plan.id),
        "user_id": user_id,
        "plan_date": now,
        "items": plan_items,
        "total_planned_minutes": total_planned,
        "burnout_adjusted": burnout_adjusted,
        "completion_rate": None,
        "status": "active",
        "generated_at": now,
    }


def _format_existing_plan(plan: DailyPlan, db: Session) -> dict:
    """Format an existing DailyPlan record for API response."""
    return {
        "plan_id": str(plan.id),
        "user_id": str(plan.user_id),
        "plan_date": plan.plan_date,
        "items": plan.planned_items or [],
        "total_planned_minutes": plan.total_planned_minutes,
        "burnout_adjusted": plan.burnout_adjusted,
        "completion_rate": plan.completion_rate,
        "status": plan.status,
        "generated_at": plan.created_at,
    }


# ---------------------------------------------------------------------------
# Insights Generator
# ---------------------------------------------------------------------------

def generate_insights(user_id: str, db: Session) -> List[dict]:
    """
    Generate personalized learning insights for the student.
    Returns a list of insight objects with type, title, description.
    """
    insights = []

    # Get states
    states = db.query(UserSkillState).filter(UserSkillState.user_id == user_id).all()
    if not states:
        return []

    # Mastered skills milestone
    mastered = [s for s in states if s.is_mastered]
    if mastered:
        insights.append({
            "type": "milestone",
            "title": f"🏆 {len(mastered)} Skills Mastered!",
            "description": f"You've mastered {len(mastered)} topic(s). Keep building on this foundation!",
            "metric_value": len(mastered),
            "action_suggestion": "Challenge yourself with harder questions on these topics.",
        })

    # High wrong streaks
    struggling = sorted([s for s in states if s.wrong_streak >= 3], key=lambda x: -x.wrong_streak)
    if struggling:
        skill = db.query(Skill).filter(Skill.id == struggling[0].skill_id).first()
        if skill:
            insights.append({
                "type": "weakness",
                "title": f"⚠️ Struggling with {skill.name}",
                "description": f"You've had {struggling[0].wrong_streak} consecutive incorrect answers. A focused 30-min session can break this pattern.",
                "skill_id": str(skill.id),
                "skill_name": skill.name,
                "metric_value": struggling[0].wrong_streak,
                "action_suggestion": "Try revisiting the fundamentals before attempting more practice.",
            })

    # Strong accuracy
    accurate = [s for s in states if s.total_attempts >= 5 and s.total_correct / s.total_attempts >= 0.85]
    if accurate:
        skill = db.query(Skill).filter(Skill.id == accurate[0].skill_id).first()
        if skill:
            insights.append({
                "type": "strength",
                "title": f"💪 Strong in {skill.name}",
                "description": f"You're achieving {accurate[0].total_correct}/{accurate[0].total_attempts} accuracy. This is a core strength!",
                "skill_id": str(skill.id),
                "skill_name": skill.name,
                "metric_value": accurate[0].total_correct / accurate[0].total_attempts,
                "action_suggestion": "Use this as a confidence booster before exams.",
            })

    # Burnout warning
    burnout = predict_burnout(user_id, db)
    if burnout["burnout_risk"] >= 0.45:
        insights.append({
            "type": "warning",
            "title": f"🔥 Burnout Risk: {burnout['risk_level'].capitalize()}",
            "description": burnout["recommendations"][0] if burnout["recommendations"] else "Manage your study load carefully.",
            "metric_value": burnout["burnout_risk"],
            "action_suggestion": "Prioritize sleep and take rest days to sustain long-term performance.",
        })

    return insights
