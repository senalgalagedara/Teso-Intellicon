import logging
from typing import Dict, Any, List
from app.db import get_db_connection
from app.config import settings
from app.engine.services.attempts import process_single_attempt
from app.engine.algorithms.selector import select_next_question

logger = logging.getLogger("revision_engine.practice")

async def get_next_practice_question(student_id: str, course_id: str) -> Dict[str, str]:
    """
    1. Catch up on student's unprocessed attempts in chronological order.
    2. Load student ability (theta) and topic mastery.
    3. Load due FSRS questions and recently seen question IDs.
    4. Select the best adaptive question from course candidates using selector algorithm.
    """
    async with get_db_connection() as conn:
        # Step 1: Catch-up on unprocessed attempts
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT a.id
                FROM app.attempts a
                LEFT JOIN engine.engine_processed p ON p.attempt_id = a.id
                WHERE a.student_id = %s AND p.attempt_id IS NULL
                ORDER BY a.answered_at ASC
                LIMIT 50
                """,
                (student_id,)
            )
            unprocessed = await cur.fetchall()

    for row in unprocessed:
        try:
            await process_single_attempt(str(row["id"]))
        except Exception as e:
            logger.error(f"Error catching up attempt {row['id']}: {e}")

    # Step 2: Load parameters and candidate pool
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            # Course & subject info
            await cur.execute("SELECT subject_id FROM app.courses WHERE id = %s", (course_id,))
            c_row = await cur.fetchone()
            subject_id = c_row["subject_id"] if c_row else None

            # Student theta
            theta = 0.0
            if subject_id:
                await cur.execute(
                    "SELECT theta FROM engine.student_ability WHERE student_id = %s AND subject_id = %s",
                    (student_id, subject_id)
                )
                ab_row = await cur.fetchone()
                if ab_row:
                    theta = float(ab_row["theta"])

            # Topic mastery map
            await cur.execute(
                "SELECT topic_id, p_mastery FROM engine.topic_mastery WHERE student_id = %s",
                (student_id,)
            )
            mastery_rows = await cur.fetchall()
            topic_mastery_map = {str(r["topic_id"]): float(r["p_mastery"]) for r in mastery_rows}

            # Due FSRS questions
            await cur.execute(
                "SELECT question_id FROM engine.fsrs_card WHERE student_id = %s AND due_at <= now()",
                (student_id,)
            )
            due_rows = await cur.fetchall()
            due_question_ids = {str(r["question_id"]) for r in due_rows}

            # Recently seen questions (last 10 attempts to prevent immediate repeat)
            await cur.execute(
                """
                SELECT question_id 
                FROM app.attempts 
                WHERE student_id = %s AND course_id = %s 
                ORDER BY answered_at DESC 
                LIMIT 10
                """,
                (student_id, course_id)
            )
            seen_rows = await cur.fetchall()
            seen_question_ids = {str(r["question_id"]) for r in seen_rows}

            # Load active candidate questions in this course
            await cur.execute(
                """
                SELECT q.id, q.topic_id, q.teacher_difficulty,
                       coalesce(r.difficulty_b, 0.0) as difficulty_b
                FROM app.questions q
                LEFT JOIN engine.question_rating r ON r.question_id = q.id
                WHERE q.course_id = %s AND q.active = true
                """,
                (course_id,)
            )
            candidates = await cur.fetchall()

    if not candidates:
        raise ValueError(f"No active questions found in course {course_id}. Please add questions first.")

    # Filter out questions seen in the immediate last attempts if other options exist
    fresh_candidates = [q for q in candidates if str(q["id"]) not in seen_question_ids]
    candidate_pool = fresh_candidates if len(fresh_candidates) >= 3 else candidates

    # Run selector
    selected = select_next_question(
        candidates=candidate_pool,
        theta=theta,
        topic_mastery_map=topic_mastery_map,
        due_question_ids=due_question_ids,
        seen_question_ids=seen_question_ids,
        weights=settings.SELECTOR_WEIGHTS
    )

    if not selected:
        chosen_q = candidates[0]
        return {"question_id": str(chosen_q["id"]), "reason": "practice starter"}

    chosen_q, reason = selected
    return {"question_id": str(chosen_q["id"]), "reason": reason}
