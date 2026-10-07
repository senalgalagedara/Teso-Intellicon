import math
import logging
from typing import Dict, Any
from app.db import get_db_connection
from app.engine.algorithms.rasch import update as rasch_update, initial_b
from app.engine.algorithms.item_stats import analyze_item

logger = logging.getLogger("revision_engine.jobs")

async def refresh_item_stats_job() -> Dict[str, Any]:
    """
    Refreshes facility, discrimination, median log RT, and sd log RT across all active questions.
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, correct_option, teacher_difficulty FROM app.questions WHERE active = true")
            questions = await cur.fetchall()

            updated_count = 0
            for q in questions:
                qid = q["id"]
                await cur.execute(
                    """
                    SELECT a.chosen_option, a.is_correct, a.latency_ms,
                           coalesce(sa.theta, 0.0) as ability_score
                    FROM app.attempts a
                    LEFT JOIN app.questions q2 ON q2.id = a.question_id
                    LEFT JOIN engine.student_ability sa ON (sa.student_id = a.student_id AND sa.subject_id = q2.subject_id)
                    WHERE a.question_id = %s
                    """,
                    (qid,)
                )
                attempts = await cur.fetchall()
                if not attempts:
                    continue

                stats = analyze_item(attempts, q["correct_option"])
                latencies = [max(100, int(a["latency_ms"])) for a in attempts]
                log_latencies = [math.log(l) for l in latencies]
                median_log = sum(log_latencies) / len(log_latencies)
                variance = sum((l - median_log) ** 2 for l in log_latencies) / len(log_latencies)
                sd_log = math.sqrt(variance) if variance > 0.01 else 0.6

                await cur.execute(
                    """
                    INSERT INTO engine.question_rating 
                      (question_id, difficulty_b, n_attempts, median_log_rt, sd_log_rt, facility, discrimination, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, now())
                    ON CONFLICT (question_id) DO UPDATE
                    SET n_attempts = EXCLUDED.n_attempts,
                        median_log_rt = EXCLUDED.median_log_rt,
                        sd_log_rt = EXCLUDED.sd_log_rt,
                        facility = EXCLUDED.facility,
                        discrimination = EXCLUDED.discrimination,
                        updated_at = now()
                    """,
                    (qid, initial_b(q["teacher_difficulty"]), len(attempts), median_log, sd_log, stats["facility"], stats["discrimination"])
                )
                updated_count += 1

    return {"status": "success", "questions_updated": updated_count}

async def recalibrate_rasch_job() -> Dict[str, Any]:
    """
    Re-runs full sequential history of attempts to recalibrate theta and b, eliminating online-update drift.
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT a.student_id, a.question_id, q.subject_id, a.is_correct,
                       q.teacher_difficulty
                FROM app.attempts a
                JOIN app.questions q ON q.id = a.question_id
                ORDER BY a.answered_at ASC
                """
            )
            history = await cur.fetchall()

    thetas: Dict[Tuple[str, str], float] = {}
    bs: Dict[str, float] = {}
    student_n: Dict[Tuple[str, str], int] = {}
    question_n: Dict[str, int] = {}

    for row in history:
        sid = str(row["student_id"])
        sub_id = str(row["subject_id"])
        qid = str(row["question_id"])
        y = 1 if row["is_correct"] else 0

        key_s = (sid, sub_id)
        if key_s not in thetas:
            thetas[key_s] = 0.0
            student_n[key_s] = 0
        if qid not in bs:
            bs[qid] = initial_b(row["teacher_difficulty"] or 2)
            question_n[qid] = 0

        new_t, new_b = rasch_update(
            thetas[key_s], bs[qid], y, student_n[key_s], question_n[qid]
        )
        thetas[key_s] = new_t
        bs[qid] = new_b
        student_n[key_s] += 1
        question_n[qid] += 1

    # Persist back into engine tables
    async with get_db_connection() as conn:
        async with conn.transaction():
            async with conn.cursor() as cur:
                for (sid, sub_id), t_val in thetas.items():
                    await cur.execute(
                        """
                        UPDATE engine.student_ability
                        SET theta = %s, updated_at = now()
                        WHERE student_id = %s AND subject_id = %s
                        """,
                        (t_val, sid, sub_id)
                    )
                for qid, b_val in bs.items():
                    await cur.execute(
                        """
                        UPDATE engine.question_rating
                        SET difficulty_b = %s, updated_at = now()
                        WHERE question_id = %s
                        """,
                        (b_val, qid)
                    )

    return {
        "status": "success",
        "students_calibrated": len(thetas),
        "questions_calibrated": len(bs)
    }

async def run_named_job(name: str) -> Dict[str, Any]:
    if name == "refresh_item_stats":
        return await refresh_item_stats_job()
    elif name == "recalibrate":
        return await recalibrate_rasch_job()
    else:
        return {"status": "noop", "message": f"Job {name} recognized but has no pending tasks."}
