"""
TESO — Burnout Predictor Service
===================================
Rule-based burnout risk estimation for A/L students.
Designed to detect overload early and recommend preventive actions.

Phase 1: Weighted rule-based scoring (simulates Random Forest behaviour).
Phase 3: Replace with trained RandomForestClassifier on historical data.

Risk bands:
  < 0.30  → Low:      Sustainable pace
  0.30–0.60 → Moderate: Monitor closely, suggest shorter sessions
  0.60–0.80 → High:    Reduce workload, mandatory breaks
  > 0.80  → Critical: Force rest day, alert user
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.adaptive_models import StudySession, EventLog, UserSkillState

# ---------------------------------------------------------------------------
# Burnout Risk Scoring Rules
# ---------------------------------------------------------------------------

# Weights must sum to 1.0
RISK_RULES = [
    {
        "name": "Long daily study sessions",
        "description": "Average daily study > 8 hours",
        "weight": 0.20,
        "check": lambda m: m.get("avg_daily_hours", 0) > 8,
    },
    {
        "name": "Extreme sessions",
        "description": "Single session > 5 hours in last 3 days",
        "weight": 0.15,
        "check": lambda m: m.get("max_session_hours", 0) > 5,
    },
    {
        "name": "No rest days",
        "description": "Studied every day for 14+ consecutive days",
        "weight": 0.20,
        "check": lambda m: m.get("consecutive_days", 0) >= 14,
    },
    {
        "name": "High missed targets",
        "description": "Completion rate < 50% this week",
        "weight": 0.15,
        "check": lambda m: m.get("avg_completion_rate", 1.0) < 0.50,
    },
    {
        "name": "Low engagement",
        "description": "Average focus score < 0.40 this week",
        "weight": 0.15,
        "check": lambda m: m.get("avg_focus_score", 1.0) < 0.40,
    },
    {
        "name": "Declining performance",
        "description": "Quiz accuracy dropped > 20% vs last week",
        "weight": 0.15,
        "check": lambda m: m.get("accuracy_drop", 0) > 0.20,
    },
]


def _get_risk_label(score: float) -> str:
    if score < 0.30:
        return "low"
    elif score < 0.60:
        return "moderate"
    elif score < 0.80:
        return "high"
    else:
        return "critical"


def _get_recommendations(risk_level: str, factors: List[str]) -> List[str]:
    recs = []
    if risk_level == "low":
        recs.append("Great work! Keep your current pace.")
        recs.append("Consider a light rest day once a week to sustain motivation.")
    elif risk_level == "moderate":
        recs.append("Consider reducing study sessions to under 3 hours at a time.")
        recs.append("Add at least one rest day per week.")
        if "No rest days" in factors:
            recs.append("Schedule a rest day this week — you've earned it.")
        if "Low engagement" in factors:
            recs.append("Try changing study environment or method to re-engage.")
    elif risk_level == "high":
        recs.append("⚠️ Reduce daily study load to 4–5 hours maximum.")
        recs.append("Take a full rest day tomorrow.")
        recs.append("Focus on quality over quantity — revise fewer topics thoroughly.")
        recs.append("Practice relaxation or exercise to recover energy.")
    else:  # critical
        recs.append("🚨 Critical burnout risk detected. Take a full day off today.")
        recs.append("Avoid any new content — rest and recovery is your priority.")
        recs.append("After rest, restart with very short (1-2h) study sessions.")
        recs.append("Talk to a teacher or counselor about managing exam stress.")
    return recs


# ---------------------------------------------------------------------------
# Metrics Collection
# ---------------------------------------------------------------------------

def _collect_metrics(user_id: str, db: Session, days_back: int = 14) -> Dict[str, Any]:
    """Collect behavioral signals from the last N days for burnout analysis."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days_back)
    week_ago = now - timedelta(days=7)

    sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == user_id,
            StudySession.started_at >= since,
            StudySession.duration_minutes.isnot(None),
        )
        .order_by(StudySession.started_at.desc())
        .all()
    )

    if not sessions:
        return {}

    # Group by day
    days_studied: Dict[str, float] = {}
    focus_scores = []
    completion_rates = []

    for s in sessions:
        day_key = s.started_at.strftime("%Y-%m-%d")
        days_studied[day_key] = days_studied.get(day_key, 0) + (s.duration_minutes or 0)
        if s.focus_score is not None:
            focus_scores.append(s.focus_score)
        if s.completion_rate is not None:
            completion_rates.append(s.completion_rate)

    daily_hours = [mins / 60.0 for mins in days_studied.values()]
    avg_daily_hours = sum(daily_hours) / len(daily_hours) if daily_hours else 0.0

    # Consecutive study days streak
    all_days = sorted(days_studied.keys())
    streak = 1
    max_streak = 1
    for i in range(1, len(all_days)):
        prev = datetime.strptime(all_days[i - 1], "%Y-%m-%d")
        curr = datetime.strptime(all_days[i], "%Y-%m-%d")
        if (curr - prev).days == 1:
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 1
    consecutive_days = max_streak

    # Max single session
    max_session_minutes = max((s.duration_minutes or 0) for s in sessions)
    max_session_hours = max_session_minutes / 60.0

    # This week quiz accuracy vs last week (from UserSkillState)
    skill_states = (
        db.query(UserSkillState)
        .filter(UserSkillState.user_id == user_id)
        .all()
    )
    avg_accuracy = (
        sum(s.retention_score for s in skill_states) / len(skill_states)
        if skill_states else 0.5
    )
    # For Phase 1, we simulate accuracy drop using wrong streaks
    avg_wrong_streak = (
        sum(s.wrong_streak for s in skill_states) / len(skill_states)
        if skill_states else 0
    )
    accuracy_drop = min(0.5, avg_wrong_streak * 0.05)

    return {
        "avg_daily_hours": round(avg_daily_hours, 2),
        "max_session_hours": round(max_session_hours, 2),
        "consecutive_days": consecutive_days,
        "avg_completion_rate": round(sum(completion_rates) / len(completion_rates), 3)
            if completion_rates else 1.0,
        "avg_focus_score": round(sum(focus_scores) / len(focus_scores), 3)
            if focus_scores else 1.0,
        "accuracy_drop": round(accuracy_drop, 3),
    }


# ---------------------------------------------------------------------------
# Main Burnout Prediction
# ---------------------------------------------------------------------------

def predict_burnout(user_id: str, db: Session) -> Dict[str, Any]:
    """
    Compute burnout risk score for a user.
    
    Returns:
        {
          "burnout_risk": float,
          "risk_level": str,
          "contributing_factors": list[str],
          "recommendations": list[str],
          "suggested_daily_hours": float,
          "recommended_rest_day": bool,
        }
    """
    metrics = _collect_metrics(user_id, db)

    if not metrics:
        # No data → no risk assessment possible
        return {
            "burnout_risk": 0.0,
            "risk_level": "low",
            "contributing_factors": [],
            "recommendations": ["Start tracking your study sessions for personalized burnout analysis."],
            "suggested_daily_hours": 6.0,
            "recommended_rest_day": False,
        }

    # Score each rule
    total_weight = 0.0
    contributing_factors = []

    for rule in RISK_RULES:
        if rule["check"](metrics):
            total_weight += rule["weight"]
            contributing_factors.append(rule["name"])

    burnout_risk = round(min(1.0, total_weight), 4)
    risk_level = _get_risk_label(burnout_risk)
    recommendations = _get_recommendations(risk_level, contributing_factors)

    # Suggested daily hours (inverse of risk)
    if burnout_risk >= 0.80:
        suggested_hours = 2.0
    elif burnout_risk >= 0.60:
        suggested_hours = 4.0
    elif burnout_risk >= 0.30:
        suggested_hours = 5.5
    else:
        suggested_hours = min(8.0, metrics.get("avg_daily_hours", 6.0) + 0.5)

    return {
        "burnout_risk": burnout_risk,
        "risk_level": risk_level,
        "contributing_factors": contributing_factors,
        "recommendations": recommendations,
        "suggested_daily_hours": suggested_hours,
        "recommended_rest_day": burnout_risk >= 0.60,
        "metrics_snapshot": metrics,
    }


def get_burnout_risk_for_state_update(user_id: str, db: Session) -> float:
    """Lightweight version — returns just the risk float for embedding in skill states."""
    result = predict_burnout(user_id, db)
    return result["burnout_risk"]
