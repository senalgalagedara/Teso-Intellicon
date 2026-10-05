import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.db import get_db_connection
from app.engine.algorithms.rasch import update as rasch_update, initial_b
from app.engine.algorithms.bkt import update as bkt_update
from app.engine.algorithms.fsrs_adapter import determine_rating, review_card
from app.engine.algorithms.diagnosis import compute_rt_z, classify_attempt

logger = logging.getLogger("revision_engine.attempts")

async def process_single_attempt(attempt_id: str) -> Dict[str, Any]:
    """
    Processes an attempt idempotently within a single transaction using row locks.
    Updates:
      1. Rasch ability (theta) and difficulty (b)
      2. Topic mastery (BKT)
      3. FSRS card state and due_at
      4. Attempt diagnosis
    Logs in engine.engine_processed.
    """
    async with get_db_connection() as conn:
        async with conn.transaction():
            async with conn.cursor() as cur:
                # 1. Check idempotency
                await cur.execute(
                    "SELECT attempt_id FROM engine.engine_processed WHERE attempt_id = %s",
                    (attempt_id,)
                )
                if await cur.fetchone():
                    # Already processed: return existing diagnosis
                    await cur.execute(
                        """
                        SELECT d.label, m.p_mastery, c.due_at
                        FROM engine.attempt_diagnosis d
                        JOIN app.attempts a ON a.id = d.attempt_id
                        LEFT JOIN app.questions q ON q.id = a.question_id
                        LEFT JOIN engine.topic_mastery m ON (m.student_id = a.student_id AND m.topic_id = q.topic_id)
                        LEFT JOIN engine.fsrs_card c ON (c.student_id = a.student_id AND c.question_id = a.question_id)
                        WHERE d.attempt_id = %s
                        """,
                        (attempt_id,)
                    )
                    row = await cur.fetchone()
                    if row:
                        return {
                            "label": row["label"],
                            "p_mastery": float(row["p_mastery"] or 0.2),
                            "next_due_at": row["due_at"]
                        }
                    return {"label": "solid", "p_mastery": 0.5, "next_due_at": None}

                # 2. Load attempt details from app.attempts
                await cur.execute(
                    """
                    SELECT a.id, a.student_id, a.question_id, a.course_id, a.chosen_option,
                           a.is_correct, a.latency_ms, a.answered_at,
                           q.subject_id, q.topic_id, q.teacher_difficulty, q.correct_option
                    FROM app.attempts a
                    JOIN app.questions q ON q.id = a.question_id
                    WHERE a.id = %s
                    """,
                    (attempt_id,)
                )
                att = await cur.fetchone()
                if not att:
                    raise ValueError(f"Attempt with id {attempt_id} not found in app.attempts")

                student_id = att["student_id"]
                question_id = att["question_id"]
                subject_id = att["subject_id"]
                topic_id = att["topic_id"]
                is_correct = bool(att["is_correct"])
                latency_ms = int(att["latency_ms"])
                y_val = 1 if is_correct else 0

                # 3. Lock & read/initialize question_rating
                await cur.execute(
                    """
                    SELECT question_id, difficulty_b, n_attempts, median_log_rt, sd_log_rt, facility, discrimination
                    FROM engine.question_rating
                    WHERE question_id = %s
                    FOR UPDATE
                    """,
                    (question_id,)
                )
                q_rating = await cur.fetchone()
                if not q_rating:
                    b_init = initial_b(att["teacher_difficulty"] or 2)
                    await cur.execute(
                        """
                        INSERT INTO engine.question_rating
                          (question_id, difficulty_b, n_attempts, median_log_rt, sd_log_rt, facility, discrimination)
                        VALUES (%s, %s, 0, 8.5, 0.6, 0.5, 0.0)
                        ON CONFLICT (question_id) DO NOTHING
                        """,
                        (question_id, b_init)
                    )
                    difficulty_b = b_init
                    n_question = 0
                    median_log_rt = 8.5
                    sd_log_rt = 0.6
                    peer_facility = 0.5
                else:
                    difficulty_b = float(q_rating["difficulty_b"])
                    n_question = int(q_rating["n_attempts"])
                    median_log_rt = float(q_rating["median_log_rt"])
                    sd_log_rt = float(q_rating["sd_log_rt"])
                    peer_facility = float(q_rating["facility"])

                # 4. Lock & read/initialize student_ability
                await cur.execute(
                    """
                    SELECT student_id, subject_id, theta, n_attempts
                    FROM engine.student_ability
                    WHERE student_id = %s AND subject_id = %s
                    FOR UPDATE
                    """,
                    (student_id, subject_id)
                )
                s_ability = await cur.fetchone()
                if not s_ability:
                    await cur.execute(
                        """
                        INSERT INTO engine.student_ability (student_id, subject_id, theta, n_attempts)
                        VALUES (%s, %s, 0.0, 0)
                        ON CONFLICT (student_id, subject_id) DO NOTHING
                        """,
                        (student_id, subject_id)
                    )
                    theta = 0.0
                    n_student = 0
                else:
                    theta = float(s_ability["theta"])
                    n_student = int(s_ability["n_attempts"])

                # 5. Compute Rasch updates
                new_theta, new_b = rasch_update(
                    theta=theta,
                    b=difficulty_b,
                    y=y_val,
                    n_student=n_student,
                    n_question=n_question
                )

                # Update online response time log statistics
                safe_lat = max(100, latency_ms)
                log_lat = math.log(safe_lat)
                # Incremental online running mean for log latency
                new_median_log_rt = (median_log_rt * n_question + log_lat) / (n_question + 1)
                new_facility = (peer_facility * n_question + y_val) / (n_question + 1)

                await cur.execute(
                    """
                    UPDATE engine.student_ability
                    SET theta = %s, n_attempts = n_attempts + 1, updated_at = now()
                    WHERE student_id = %s AND subject_id = %s
                    """,
                    (new_theta, student_id, subject_id)
                )

                await cur.execute(
                    """
                    UPDATE engine.question_rating
                    SET difficulty_b = %s, n_attempts = n_attempts + 1,
                        median_log_rt = %s, facility = %s, updated_at = now()
                    WHERE question_id = %s
                    """,
                    (new_b, new_median_log_rt, new_facility, question_id)
                )

                # 6. BKT Topic Mastery update (if topic assigned)
                p_mastery = 0.2
                if topic_id:
                    await cur.execute(
                        """
                        SELECT p_mastery, n_obs
                        FROM engine.topic_mastery
                        WHERE student_id = %s AND topic_id = %s
                        FOR UPDATE
                        """,
                        (student_id, topic_id)
                    )
                    m_row = await cur.fetchone()
                    if m_row:
                        prior_p = float(m_row["p_mastery"])
                        p_mastery = bkt_update(prior_p, is_correct)
                        await cur.execute(
                            """
                            UPDATE engine.topic_mastery
                            SET p_mastery = %s, n_obs = n_obs + 1, updated_at = now()
                            WHERE student_id = %s AND topic_id = %s
                            """,
                            (p_mastery, student_id, topic_id)
                        )
                    else:
                        p_mastery = bkt_update(0.2, is_correct)
                        await cur.execute(
                            """
                            INSERT INTO engine.topic_mastery (student_id, topic_id, p_mastery, n_obs)
                            VALUES (%s, %s, %s, 1)
                            ON CONFLICT (student_id, topic_id) DO UPDATE
                            SET p_mastery = EXCLUDED.p_mastery, n_obs = engine.topic_mastery.n_obs + 1, updated_at = now()
                            """,
                            (student_id, topic_id, p_mastery)
                        )

                # 7. Compute rt_z and attempt diagnosis
                rt_z = compute_rt_z(latency_ms, median_log_rt, sd_log_rt)
                diagnosis_label = classify_attempt(is_correct, rt_z, peer_facility)

                await cur.execute(
                    """
                    INSERT INTO engine.attempt_diagnosis (attempt_id, label, rt_z, peer_facility)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (attempt_id) DO UPDATE
                    SET label = EXCLUDED.label, rt_z = EXCLUDED.rt_z, peer_facility = EXCLUDED.peer_facility
                    """,
                    (attempt_id, diagnosis_label, float(rt_z), float(peer_facility))
                )

                # 8. FSRS Spaced Repetition card update
                await cur.execute(
                    "SELECT state FROM engine.fsrs_card WHERE student_id = %s AND question_id = %s",
                    (student_id, question_id)
                )
                card_row = await cur.fetchone()
                existing_card_state = card_row["state"] if card_row else None
                
                fsrs_rating_val = determine_rating(is_correct, rt_z, p_mastery)
                new_state, next_due_at = review_card(existing_card_state, fsrs_rating_val)

                import json
                await cur.execute(
                    """
                    INSERT INTO engine.fsrs_card (student_id, question_id, state, due_at, last_review_at)
                    VALUES (%s, %s, %s, %s, now())
                    ON CONFLICT (student_id, question_id) DO UPDATE
                    SET state = EXCLUDED.state, due_at = EXCLUDED.due_at, last_review_at = now()
                    """,
                    (student_id, question_id, json.dumps(new_state), next_due_at)
                )

                # 9. Mark processed in engine_processed
                await cur.execute(
                    "INSERT INTO engine.engine_processed (attempt_id) VALUES (%s) ON CONFLICT DO NOTHING",
                    (attempt_id,)
                )

                return {
                    "label": diagnosis_label,
                    "p_mastery": round(p_mastery, 3),
                    "next_due_at": next_due_at
                }
