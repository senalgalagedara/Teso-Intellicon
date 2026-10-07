from typing import List, Dict, Any, Optional
from app.db import get_db_connection
from app.engine.algorithms.bkt import mastery_status

async def get_due_reviews(student_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Returns questions due for FSRS review for a student, ordered by earliest due date.
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT c.question_id, c.due_at, c.state,
                       q.stem, q.teacher_difficulty,
                       coalesce(r.difficulty_b, 0.0) as difficulty_b
                FROM engine.fsrs_card c
                JOIN app.questions q ON q.id = c.question_id
                LEFT JOIN engine.question_rating r ON r.question_id = q.id
                WHERE c.student_id = %s AND c.due_at <= now()
                ORDER BY c.due_at ASC
                LIMIT %s
                """,
                (student_id, limit)
            )
            rows = await cur.fetchall()

    items = []
    for r in rows:
        state = r["state"] or {}
        stability = float(state.get("stability", 1.0))
        # Approximate retrievability estimate
        retrievability = max(0.1, min(1.0, 1.0 / (1.0 + 0.1 / stability)))
        items.append({
            "question_id": str(r["question_id"]),
            "retrievability": round(retrievability, 3),
            "due_at": r["due_at"]
        })
    return items

async def get_student_progress(student_id: str, course_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Loads overall Rasch ability (theta), topic mastery list, and count of due reviews.
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            # 1. Student theta
            await cur.execute(
                """
                SELECT avg(theta) as avg_theta
                FROM engine.student_ability
                WHERE student_id = %s
                """,
                (student_id,)
            )
            theta_row = await cur.fetchone()
            theta = float(theta_row["avg_theta"] or 0.0) if theta_row else 0.0

            # 2. Review load (cards due now)
            await cur.execute(
                "SELECT count(*) as due_count FROM engine.fsrs_card WHERE student_id = %s AND due_at <= now()",
                (student_id,)
            )
            count_row = await cur.fetchone()
            review_load = int(count_row["due_count"] or 0) if count_row else 0

            # 3. Topic masteries
            await cur.execute(
                """
                SELECT m.topic_id, t.name as topic_name, m.p_mastery
                FROM engine.topic_mastery m
                JOIN app.topics t ON t.id = m.topic_id
                WHERE m.student_id = %s
                ORDER BY m.p_mastery ASC
                """,
                (student_id,)
            )
            mastery_rows = await cur.fetchall()

    topic_items = []
    weak_topics = []
    for r in mastery_rows:
        p_val = float(r["p_mastery"])
        status_label = mastery_status(p_val)
        topic_items.append({
            "topic_id": str(r["topic_id"]),
            "topic_name": r["topic_name"],
            "p_mastery": round(p_val, 3),
            "status": status_label
        })
        if status_label == "weak":
            weak_topics.append(r["topic_name"])

    return {
        "student_id": student_id,
        "theta": round(theta, 3),
        "review_load": review_load,
        "topic_mastery": topic_items,
        "weak_topics": weak_topics
    }

async def get_peer_diagnostics(student_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Separates student's incorrect attempts into:
    - missed_peer_easy: Questions missed where peer facility > 0.85 (peer-easy traps/careless slips)
    - cohort_hard: Questions missed where peer facility < 0.20 (hard for everyone)
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            query = """
                SELECT a.question_id, a.chosen_option, a.latency_ms,
                       q.stem, q.correct_option,
                       d.label as diagnosis_label, d.peer_facility
                FROM app.attempts a
                JOIN app.questions q ON q.id = a.question_id
                JOIN engine.attempt_diagnosis d ON d.attempt_id = a.id
                WHERE a.student_id = %s AND a.is_correct = false
            """
            params = [student_id]
            if session_id:
                query += " AND a.session_id = %s"
                params.append(session_id)
            query += " ORDER BY a.answered_at DESC LIMIT 50"

            await cur.execute(query, tuple(params))
            rows = await cur.fetchall()

    missed_peer_easy = []
    cohort_hard = []

    for r in rows:
        fac = float(r["peer_facility"])
        item = {
            "question_id": str(r["question_id"]),
            "stem": r["stem"],
            "chosen_option": r["chosen_option"],
            "correct_option": r["correct_option"],
            "peer_facility": round(fac, 3),
            "latency_ms": int(r["latency_ms"]),
            "diagnosis_label": r["diagnosis_label"]
        }
        if fac > 0.85:
            missed_peer_easy.append(item)
        elif fac < 0.20:
            cohort_hard.append(item)

    return {
        "session_id": session_id,
        "missed_peer_easy": missed_peer_easy,
        "cohort_hard": cohort_hard
    }
