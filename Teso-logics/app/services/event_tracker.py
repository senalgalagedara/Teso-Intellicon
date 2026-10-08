"""
TESO — Event Tracker Service
==============================
Append-only event log: records every user interaction and
triggers the User State Engine to update skill states.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from app.models.adaptive_models import EventLog, StudySession

logger = logging.getLogger(__name__)


def track_event(
    user_id: str,
    event_type: str,
    db: Session,
    skill_id: Optional[str] = None,
    question_id: Optional[str] = None,
    session_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    client_timestamp: Optional[datetime] = None,
) -> EventLog:
    """
    Append an event to the event_log table.
    
    Called after every student interaction:
      - quiz_answered
      - lesson_completed
      - revision_done
      - session_started / session_ended
      - video_rewatched
      - confidence_submitted
      - break_taken
    
    Returns the created EventLog record.
    """
    event = EventLog(
        user_id=user_id,
        event_type=event_type,
        skill_id=skill_id,
        question_id=question_id,
        session_id=session_id,
        payload=payload or {},
        client_timestamp=client_timestamp,
        server_timestamp=datetime.now(timezone.utc),
    )
    db.add(event)
    db.flush()   # get the ID without committing

    logger.info(
        "Event tracked: %s | user=%s | skill=%s | question=%s",
        event_type, user_id, skill_id, question_id
    )
    return event


def start_session(
    user_id: str,
    db: Session,
    planned_duration_minutes: Optional[float] = None,
    device_type: Optional[str] = None,
) -> StudySession:
    """Create a new StudySession record and track session_started event."""
    now = datetime.now(timezone.utc)
    session = StudySession(
        user_id=user_id,
        started_at=now,
        planned_duration_minutes=planned_duration_minutes,
        device_type=device_type,
    )
    db.add(session)
    db.flush()

    track_event(
        user_id=user_id,
        event_type="session_started",
        db=db,
        session_id=str(session.id),
        payload={"planned_duration_minutes": planned_duration_minutes}
    )
    db.commit()
    return session


def end_session(
    session_id: str,
    user_id: str,
    db: Session,
    interruptions: int = 0,
    completion_rate: float = 1.0,
) -> StudySession:
    """Finalize a StudySession and compute focus score."""
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    now = datetime.now(timezone.utc)
    session.ended_at = now
    session.interruptions = interruptions
    session.completion_rate = completion_rate

    # Calculate duration
    if session.started_at:
        duration = (now - session.started_at).total_seconds() / 60.0
        session.duration_minutes = round(duration, 2)

    # Focus score heuristic:
    # - Start at completion_rate
    # - Penalise interruptions (each interruption costs 0.1)
    # - Penalise if session way shorter than planned
    focus = completion_rate - (interruptions * 0.1)
    if session.planned_duration_minutes and session.duration_minutes:
        ratio = session.duration_minutes / session.planned_duration_minutes
        if ratio < 0.5:
            focus -= 0.15
    session.focus_score = max(0.0, min(1.0, focus))

    track_event(
        user_id=user_id,
        event_type="session_ended",
        db=db,
        session_id=session_id,
        payload={
            "duration_minutes": session.duration_minutes,
            "focus_score": session.focus_score,
            "interruptions": interruptions,
            "completion_rate": completion_rate,
        }
    )
    db.commit()
    db.refresh(session)
    return session


def get_recent_events(
    user_id: str,
    db: Session,
    limit: int = 20,
    event_type: Optional[str] = None,
) -> list:
    """Fetch recent events for a user, optionally filtered by type."""
    query = db.query(EventLog).filter(EventLog.user_id == user_id)
    if event_type:
        query = query.filter(EventLog.event_type == event_type)
    return query.order_by(EventLog.server_timestamp.desc()).limit(limit).all()
