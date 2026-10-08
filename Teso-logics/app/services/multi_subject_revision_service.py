"""
TESO — Multi-Subject Adaptive Revision Engine Service
File: app/services/multi_subject_revision_service.py

Handles:
- Subject enrollment extraction
- Spaced repetition queue aggregation with Ebbinghaus memory decay
- Vygotsky Zone of Proximal Development (ZPD) adaptive question selection
- Duolingo-style question recalibration + BKT student state updates
"""

import uuid
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.revision_models import (
    Subject, SubjectTopic, SubjectSubtopic,
    StudentSubjectEnrollment, QuestionBank, UserSubtopicState, ExamLevel
)
from app.models.base_models import User
from app.services.duolingo_difficulty_engine import (
    evaluate_answer,
    calibrate_question_on_attempt,
    bkt_update_for_level,
    get_guessing_probability
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_INTERVALS = [1, 3, 7, 14, 30, 60, 90]
MAX_INTERVAL_DAYS = 90
DEFAULT_QUIZ_COUNT = 10


# ---------------------------------------------------------------------------
# 1. Enrollment & User Subtopic State Helpers
# ---------------------------------------------------------------------------

def get_or_create_subtopic_state(
    user_id: uuid.UUID,
    subtopic: SubjectSubtopic,
    subject_id: uuid.UUID,
    db: Session
) -> UserSubtopicState:
    """
    Retrieves or initializes a student's learning state for a specific subtopic.
    """
    state = (
        db.query(UserSubtopicState)
        .filter(
            UserSubtopicState.user_id == user_id,
            UserSubtopicState.subtopic_id == subtopic.id,
        )
        .first()
    )
    if not state:
        state = UserSubtopicState(
            user_id=user_id,
            subject_id=subject_id,
            subtopic_id=subtopic.id,
            mastery_probability=0.10,
            memory_strength=1.0,
            stability_factor=1.0,
            forgetting_risk=0.0,
            student_ability_theta=0.0,
            current_interval_days=1,
            next_revision_due=datetime.now(timezone.utc) + timedelta(days=1),
            review_count=0,
            correct_streak=0,
            wrong_streak=0,
            total_attempts=0,
            total_correct=0,
            is_mastered=False,
        )
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def sync_user_enrolled_subjects(user_id: uuid.UUID, db: Session) -> List[Subject]:
    """
    Returns subjects enrolled by student. If no explicit enrollments exist,
    auto-enrolls active subjects matching student's exam level or all active subjects.
    """
    enrollments = (
        db.query(StudentSubjectEnrollment)
        .filter(StudentSubjectEnrollment.user_id == user_id)
        .all()
    )
    if enrollments:
        subject_ids = [e.subject_id for e in enrollments]
        return db.query(Subject).filter(Subject.id.in_(subject_ids), Subject.is_active == True).all()

    # Fallback / Auto-enroll active subjects
    default_subjects = db.query(Subject).filter(Subject.is_active == True).limit(5).all()
    for s in default_subjects:
        enrollment = StudentSubjectEnrollment(
            user_id=user_id,
            subject_id=s.id,
            is_primary=True,
        )
        db.add(enrollment)
    db.commit()
    return default_subjects


# ---------------------------------------------------------------------------
# 2. Memory Decay & Revision Queue
# ---------------------------------------------------------------------------

def calculate_memory_retention(stability_factor: float, days_elapsed: float) -> float:
    """
    Ebbinghaus exponential forgetting curve: R(t) = exp(-t / S)
    """
    if days_elapsed <= 0 or stability_factor <= 0:
        return 1.0
    retention = math.exp(-days_elapsed / max(0.1, stability_factor))
    return round(max(0.01, min(1.0, retention)), 4)


def get_student_revision_queue(
    user_id: uuid.UUID,
    subject_id_filter: Optional[uuid.UUID],
    db: Session,
    limit: int = 15
) -> List[Dict[str, Any]]:
    """
    Aggregates due and at-risk subtopics across student's enrolled subjects.
    Applies real-time Ebbinghaus decay to each subtopic state.
    """
    enrolled_subjects = sync_user_enrolled_subjects(user_id, db)
    enrolled_subject_ids = [s.id for s in enrolled_subjects]

    if not enrolled_subject_ids:
        return []

    # If filter provided, ensure it's in enrolled subjects
    if subject_id_filter and subject_id_filter in enrolled_subject_ids:
        target_subject_ids = [subject_id_filter]
    else:
        target_subject_ids = enrolled_subject_ids

    # Fetch all subtopics for targeted subjects
    subtopics = (
        db.query(SubjectSubtopic, SubjectTopic, Subject)
        .join(SubjectTopic, SubjectSubtopic.topic_id == SubjectTopic.id)
        .join(Subject, SubjectTopic.subject_id == Subject.id)
        .filter(
            Subject.id.in_(target_subject_ids),
            SubjectSubtopic.is_active == True,
            Subject.is_active == True
        )
        .all()
    )

    now = datetime.now(timezone.utc)
    queue_items = []

    for subtopic, topic, subject in subtopics:
        state = get_or_create_subtopic_state(user_id, subtopic, subject.id, db)

        # Calculate time elapsed since last review
        last_date = state.last_revised_at or state.updated_at or now
        days_elapsed = max(0.0, (now - last_date).total_seconds() / 86400.0)

        # Apply Ebbinghaus decay
        decayed_retention = calculate_memory_retention(state.stability_factor, days_elapsed)
        forgetting_risk = round(1.0 - decayed_retention, 4)

        # Overdue check
        is_overdue = state.next_revision_due is not None and now >= state.next_revision_due
        days_overdue = 0.0
        if is_overdue:
            days_overdue = (now - state.next_revision_due).total_seconds() / 86400.0

        # Calculate composite priority score
        # Priority = overdue_weight + forgetting_risk_weight + unmastered_weight
        priority = (
            (10.0 if is_overdue else 0.0)
            + (days_overdue * 2.0)
            + (forgetting_risk * 5.0)
            + ((1.0 - state.mastery_probability) * 3.0)
        )

        queue_items.append({
            "subtopic_id": subtopic.id,
            "subtopic_code": subtopic.subtopic_code,
            "subtopic_name": subtopic.name,
            "topic_name": topic.name,
            "subject_id": subject.id,
            "subject_name": subject.name,
            "memory_strength": decayed_retention,
            "forgetting_risk": forgetting_risk,
            "mastery_probability": state.mastery_probability,
            "stability_factor": state.stability_factor,
            "current_interval_days": state.current_interval_days,
            "next_revision_due": state.next_revision_due,
            "is_overdue": is_overdue,
            "priority_score": round(priority, 2),
        })

    # Sort descending by priority
    queue_items.sort(key=lambda x: x["priority_score"], reverse=True)
    return queue_items[:limit]


# ---------------------------------------------------------------------------
# 3. Adaptive Question Selection (Vygotsky ZPD)
# ---------------------------------------------------------------------------

def select_adaptive_questions(
    user_id: uuid.UUID,
    subject_id: Optional[uuid.UUID],
    subtopic_id: Optional[uuid.UUID],
    question_count: int,
    db: Session
) -> Tuple[List[QuestionBank], float]:
    """
    Selects questions using Vygotsky Zone of Proximal Development:
    - 60% Target Band: near student mastery + 0.15
    - 20% Easy Band: foundation/confidence reinforcement
    - 20% Hard Band: stretch/challenge
    """
    enrolled_subjects = sync_user_enrolled_subjects(user_id, db)
    subject_map = {s.id: s for s in enrolled_subjects}

    # Query base filter
    query = db.query(QuestionBank).filter(QuestionBank.is_active == True)

    if subtopic_id:
        query = query.filter(QuestionBank.subtopic_id == subtopic_id)
        # Find related subject
        st = db.query(SubjectSubtopic).filter(SubjectSubtopic.id == subtopic_id).first()
        if st:
            topic = db.query(SubjectTopic).filter(SubjectTopic.id == st.topic_id).first()
            if topic and topic.subject_id in subject_map:
                subject_id = topic.subject_id
    elif subject_id:
        query = query.filter(QuestionBank.subject_id == subject_id)
    else:
        # Mix across enrolled subjects
        query = query.filter(QuestionBank.subject_id.in_(list(subject_map.keys())))

    # Determine average mastery of targeted scope
    if subtopic_id:
        state = db.query(UserSubtopicState).filter(
            UserSubtopicState.user_id == user_id,
            UserSubtopicState.subtopic_id == subtopic_id
        ).first()
        current_mastery = state.mastery_probability if state else 0.20
    else:
        states = db.query(UserSubtopicState).filter(
            UserSubtopicState.user_id == user_id,
            UserSubtopicState.subject_id == subject_id if subject_id else True
        ).all()
        current_mastery = (
            sum(s.mastery_probability for s in states) / len(states)
            if states else 0.25
        )

    target_diff = min(0.95, current_mastery + 0.15)
    all_available = query.all()

    if not all_available:
        return [], target_diff

    # Partition into bands
    easy_band = [q for q in all_available if q.difficulty_score < max(0.1, target_diff - 0.20)]
    hard_band = [q for q in all_available if q.difficulty_score > min(0.9, target_diff + 0.20)]
    target_band = [q for q in all_available if q not in easy_band and q not in hard_band]

    # Target counts: 60% target, 20% easy, 20% hard
    n_target = max(1, int(round(question_count * 0.60)))
    n_easy = max(1, int(round(question_count * 0.20)))
    n_hard = question_count - n_target - n_easy

    selected: List[QuestionBank] = []
    selected.extend(random.sample(target_band, min(len(target_band), n_target)))
    selected.extend(random.sample(easy_band, min(len(easy_band), n_easy)))
    selected.extend(random.sample(hard_band, min(len(hard_band), n_hard)))

    # Fill deficit if any band had insufficient questions
    deficit = question_count - len(selected)
    if deficit > 0:
        remaining = [q for q in all_available if q not in selected]
        selected.extend(random.sample(remaining, min(len(remaining), deficit)))

    # Sort selected questions strictly according to syllabus lesson and subtopic order
    topic_map = {t.id: (t.order_index, t.topic_number) for t in db.query(SubjectTopic).all()}
    subtopic_map = {st.id: (st.order_index, st.subtopic_code) for st in db.query(SubjectSubtopic).all()}

    selected.sort(key=lambda q: (
        topic_map.get(q.topic_id, (999, 999.0)),
        subtopic_map.get(q.subtopic_id, (999, ""))
    ))

    return selected, target_diff


# ---------------------------------------------------------------------------
# 4. Single Question Submission (Immediate Feedback & Duolingo Recalibration)
# ---------------------------------------------------------------------------

def process_single_question_submission(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    selected_answer_number: Optional[int],
    response_time_ms: int,
    confidence_rating: int,
    db: Session
) -> Dict[str, Any]:
    """
    Submits and grades a single question immediately:
    - Evaluates answer against primary, additional, or bonus keys
    - Recalibrates question difficulty and Elo rating dynamically (Duolingo engine)
    - Updates student's subtopic mastery (BKT) and memory strength
    - Returns instant feedback with explanation and new difficulty rating
    """
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise ValueError("Question not found")

    is_correct = evaluate_answer(
        selected_answer_number=selected_answer_number,
        correct_answer_number=question.correct_answer_number,
        additional_correct_answer_number=question.additional_correct_answer_number
    )
    old_diff = question.difficulty_score

    # Fetch student ability theta
    state = db.query(UserSubtopicState).filter(
        UserSubtopicState.user_id == user_id,
        UserSubtopicState.subtopic_id == question.subtopic_id
    ).first()
    student_theta = state.student_ability_theta if state else 0.0

    # 1. DUOLINGO RECALIBRATION
    calibrate_question_on_attempt(
        question=question,
        student_theta=student_theta,
        is_correct=is_correct
    )

    # 2. STUDENT BKT & MEMORY UPDATE
    st = db.query(SubjectSubtopic).filter(SubjectSubtopic.id == question.subtopic_id).first()
    topic = db.query(SubjectTopic).filter(SubjectTopic.id == (st.topic_id if st else None)).first()
    subject_id = topic.subject_id if topic else question.subject_id
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    exam_level = subject.exam_level if subject else "AL"

    if not state and st:
        state = get_or_create_subtopic_state(user_id, st, subject_id, db)

    if state:
        state.mastery_probability = bkt_update_for_level(
            p_mastery=state.mastery_probability,
            is_correct=is_correct,
            exam_level=exam_level
        )
        state.total_attempts += 1
        if is_correct:
            state.total_correct += 1
            state.correct_streak += 1
            state.wrong_streak = 0
            state.student_ability_theta = min(3.0, state.student_ability_theta + 0.10)
            stability_mult = 1.20
        else:
            state.wrong_streak += 1
            state.correct_streak = 0
            state.student_ability_theta = max(-3.0, state.student_ability_theta - 0.10)
            stability_mult = 0.85

        state.is_mastered = state.mastery_probability >= 0.85
        state.stability_factor = max(0.5, round(state.stability_factor * stability_mult, 2))
        state.memory_strength = 1.0
        state.forgetting_risk = 0.0
        state.last_revised_at = datetime.now(timezone.utc)
        state.review_count += 1
        db.commit()

    earned_xp = 15 if is_correct else 3
    msg = "Correct! Well done!" if is_correct else "Incorrect. Review the explanation below."

    return {
        "question_id": question.id,
        "is_correct": is_correct,
        "selected_answer_number": selected_answer_number,
        "correct_answer_number": question.correct_answer_number,
        "additional_correct_answer_number": question.additional_correct_answer_number,
        "explanation_text": question.explanation_text,
        "explanation_image_url": question.explanation_image_url,
        "old_difficulty": old_diff,
        "new_difficulty": question.difficulty_score,
        "elo_rating": question.elo_rating,
        "new_mastery_probability": state.mastery_probability if state else 0.2,
        "new_memory_strength": state.memory_strength if state else 1.0,
        "earned_xp": earned_xp,
        "subtopic_name": st.name if st else "General",
        "message": msg
    }

def process_revision_quiz_submission(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    answers: List[Any],
    db: Session
) -> Dict[str, Any]:
    """
    Processes answers from revision quiz:
    1. Evaluates answers against primary and additional keys
    2. Recalibrates QuestionBank difficulty in real time (Duolingo engine)
    3. Updates student UserSubtopicState mastery (BKT) and memory retention (SM-2)
    4. Computes score percentage and earned XP
    """
    total = len(answers)
    if total == 0:
        return {"error": "No answers provided"}

    correct_count = 0
    results = []
    subtopic_attempts: Dict[uuid.UUID, List[Tuple[bool, int]]] = {}
    now = datetime.now(timezone.utc)

    for item in answers:
        q_id = item.question_id
        selected = item.selected_answer_number
        time_ms = item.response_time_ms

        question = db.query(QuestionBank).filter(QuestionBank.id == q_id).first()
        if not question:
            continue

        # Evaluate correctness (Primary key, Additional key, or Bonus)
        is_correct = evaluate_answer(
            selected_answer_number=selected,
            correct_answer_number=question.correct_answer_number,
            additional_correct_answer_number=question.additional_correct_answer_number
        )
        if is_correct:
            correct_count += 1

        old_diff = question.difficulty_score

        # Get student's current ability theta for this subtopic
        state = db.query(UserSubtopicState).filter(
            UserSubtopicState.user_id == user_id,
            UserSubtopicState.subtopic_id == question.subtopic_id
        ).first()
        student_theta = state.student_ability_theta if state else 0.0

        # LOOP 1: DUOLINGO QUESTION DIFFICULTY RECALIBRATION
        calibrated_stats = calibrate_question_on_attempt(
            question=question,
            student_theta=student_theta,
            is_correct=is_correct
        )

        results.append({
            "question_id": question.id,
            "is_correct": is_correct,
            "selected_answer_number": selected,
            "correct_answer_number": question.correct_answer_number,
            "additional_correct_answer_number": question.additional_correct_answer_number,
            "explanation_text": question.explanation_text,
            "explanation_image_url": question.explanation_image_url,
            "old_difficulty": old_diff,
            "new_difficulty": question.difficulty_score,
        })

        if question.subtopic_id not in subtopic_attempts:
            subtopic_attempts[question.subtopic_id] = []
        subtopic_attempts[question.subtopic_id].append((is_correct, time_ms))

    # LOOP 2: STUDENT STATE & BKT & SM-2 INTERVAL UPDATES
    mastery_updates: Dict[str, float] = {}
    memory_updates: Dict[str, float] = {}

    for subtopic_id, attempts in subtopic_attempts.items():
        st = db.query(SubjectSubtopic).filter(SubjectSubtopic.id == subtopic_id).first()
        if not st:
            continue

        topic = db.query(SubjectTopic).filter(SubjectTopic.id == st.topic_id).first()
        subject_id = topic.subject_id if topic else None
        if not subject_id:
            continue

        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        exam_level = subject.exam_level if subject else "AL"

        state = get_or_create_subtopic_state(user_id, st, subject_id, db)

        subtopic_correct = sum(1 for c, _ in attempts if c)
        subtopic_perf = subtopic_correct / len(attempts)

        # 1. BKT Mastery Update per question attempt
        for c, _ in attempts:
            state.mastery_probability = bkt_update_for_level(
                p_mastery=state.mastery_probability,
                is_correct=c,
                exam_level=exam_level
            )
            state.total_attempts += 1
            if c:
                state.total_correct += 1

        state.is_mastered = state.mastery_probability >= 0.85

        # 2. Update Student Ability Theta
        if subtopic_perf >= 0.70:
            state.student_ability_theta = min(3.0, state.student_ability_theta + 0.15)
        else:
            state.student_ability_theta = max(-3.0, state.student_ability_theta - 0.15)

        # 3. SM-2 Stability & Next Revision Schedule
        if subtopic_perf >= 0.90:
            stability_mult = 1.30
            interval_mult = 2.5
            state.correct_streak += 1
            state.wrong_streak = 0
        elif subtopic_perf >= 0.70:
            stability_mult = 1.10
            interval_mult = 2.0
            state.correct_streak += 1
            state.wrong_streak = 0
        elif subtopic_perf >= 0.50:
            stability_mult = 1.00
            interval_mult = 1.3
            state.wrong_streak = 0
        else:
            stability_mult = 0.80
            interval_mult = 0.0  # Reset interval
            state.correct_streak = 0
            state.wrong_streak += 1

        state.stability_factor = max(0.5, round(state.stability_factor * stability_mult, 2))

        if interval_mult > 0:
            state.current_interval_days = min(
                MAX_INTERVAL_DAYS,
                max(1, int(round(state.current_interval_days * interval_mult)))
            )
        else:
            state.current_interval_days = 1

        state.next_revision_due = now + timedelta(days=state.current_interval_days)
        state.last_revised_at = now
        state.memory_strength = 1.0
        state.forgetting_risk = 0.0
        state.review_count += 1

        mastery_updates[str(st.id)] = state.mastery_probability
        memory_updates[str(st.id)] = state.memory_strength

    db.commit()

    score_pct = round((correct_count / total) * 100.0, 1) if total > 0 else 0.0
    earned_xp = int(correct_count * 10 + (25 if score_pct >= 80 else 10))

    return {
        "session_id": session_id,
        "total_questions": total,
        "correct_count": correct_count,
        "score_percentage": score_pct,
        "subtopic_mastery_updates": mastery_updates,
        "subtopic_memory_updates": memory_updates,
        "results": results,
        "earned_xp": earned_xp,
        "message": f"Revision session completed! Score: {score_pct}%. Dynamic difficulties calibrated."
    }
