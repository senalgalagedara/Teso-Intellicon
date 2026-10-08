import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Return a raw psycopg2 connection using the DATABASE_URL env var."""
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def save_study_plan(user_id: str, plan_data: dict) -> str:
    """
    Persist a generated study plan for a user.
    Returns the new plan's UUID.
    """
    import json
    from datetime import datetime, timezone

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO study_plan
                    (id, "userId", months, "hoursPerDay", "offDays",
                     "totalDays", "totalHours", "planData", "createdAt", "updatedAt")
                VALUES
                    (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
                """,
                (
                    user_id,
                    plan_data["months"],
                    plan_data["hours_per_day"],
                    plan_data["off_days"],
                    plan_data["total_days"],
                    plan_data["total_hours"],
                    json.dumps(plan_data["daily_plan"]),
                ),
            )
            plan_id = cur.fetchone()[0]
        conn.commit()
        return plan_id
    finally:
        conn.close()


def get_study_plans_for_user(user_id: str) -> list:
    """Return a list of study plan summaries for a given user."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, months, "hoursPerDay", "offDays",
                       "totalDays", "totalHours", "planData", "createdAt"
                FROM study_plan
                WHERE "userId" = %s
                ORDER BY "createdAt" DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_study_plan_by_id(plan_id: str) -> dict | None:
    """Return a single study plan by its ID."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, "userId", months, "hoursPerDay", "offDays",
                       "totalDays", "totalHours", "planData", "createdAt"
                FROM study_plan
                WHERE id = %s
                """,
                (plan_id,),
            )
            row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def delete_study_plan(plan_id: str, user_id: str) -> bool:
    """Delete a study plan (only if it belongs to the user). Returns True on success."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'DELETE FROM study_plan WHERE id = %s AND "userId" = %s',
                (plan_id, user_id),
            )
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()


def upsert_day_progress(
    plan_id: str,
    user_id: str,
    day_number: int,
    lesson_done=None,
    mcq_done=None,
    p2_done=None,
) -> dict:
    """
    Insert or update the study_day_progress row for (plan_id, day_number).
    Only provided (non-None) fields are updated; existing values are preserved.
    Returns the full row as a dict.
    """
    from datetime import datetime, timezone

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Fetch current state
            cur.execute(
                'SELECT * FROM study_day_progress WHERE "planId" = %s AND "dayNumber" = %s',
                (plan_id, day_number),
            )
            existing = cur.fetchone()

            if existing:
                new_lesson = lesson_done if lesson_done is not None else existing["lessonDone"]
                new_mcq = mcq_done if mcq_done is not None else existing["mcqDone"]
                new_p2 = p2_done if p2_done is not None else existing["p2Done"]
            else:
                new_lesson = lesson_done if lesson_done is not None else False
                new_mcq = mcq_done if mcq_done is not None else False
                new_p2 = p2_done if p2_done is not None else False

            day_completed = new_lesson and new_mcq and new_p2
            completed_at = None
            if day_completed:
                completed_at = existing["completedAt"] if existing else datetime.now(timezone.utc)

            if existing:
                cur.execute(
                    '''UPDATE study_day_progress
                       SET "lessonDone"=%s, "mcqDone"=%s, "p2Done"=%s,
                           "dayCompleted"=%s, "completedAt"=%s, "updatedAt"=NOW()
                       WHERE "planId"=%s AND "dayNumber"=%s
                       RETURNING *''',
                    (new_lesson, new_mcq, new_p2, day_completed, completed_at, plan_id, day_number),
                )
            else:
                cur.execute(
                    '''INSERT INTO study_day_progress
                       (id, "planId", "userId", "dayNumber", "lessonDone", "mcqDone", "p2Done",
                        "dayCompleted", "completedAt", "createdAt", "updatedAt")
                       VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                       RETURNING *''',
                    (plan_id, user_id, day_number, new_lesson, new_mcq, new_p2,
                     day_completed, completed_at),
                )
            row = dict(cur.fetchone())
        conn.commit()
        return row
    finally:
        conn.close()


def get_plan_progress(plan_id: str) -> list:
    """Return all day-progress rows for a plan, ordered by day_number."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                'SELECT * FROM study_day_progress WHERE "planId" = %s ORDER BY "dayNumber"',
                (plan_id,),
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
