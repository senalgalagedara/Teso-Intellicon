#!/usr/bin/env python3
"""
Seed script: creates mock students, enrollment links, and assessment scores
to populate cohort analytics and cross-subject Z-score simulations.
Usage: python scripts/seed_mock_cohort.py
"""

import os
import random
import uuid
import psycopg
from psycopg.rows import dict_row

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    print("Error: DATABASE_URL not set in environment.")
    exit(1)

MOCK_STUDENTS = [
    {"name": "Kasun Perera", "email": "kasun.p@example.com", "ability": 1.8},
    {"name": "Nimali Silva", "email": "nimali.s@example.com", "ability": 1.5},
    {"name": "Dinuka Jayasuriya", "email": "dinuka.j@example.com", "ability": 0.8},
    {"name": "Anuki Fernando", "email": "anuki.f@example.com", "ability": 0.2},
    {"name": "Charith Bandara", "email": "charith.b@example.com", "ability": -0.4},
    {"name": "Rashmi Wickramasinghe", "email": "rashmi.w@example.com", "ability": -1.2},
]

def seed_cohort():
    with psycopg.connect(DB_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Check for existing courses
            cur.execute("SELECT id, title, subject_id FROM app.courses LIMIT 3")
            courses = cur.fetchall()

            if not courses:
                print("No courses found. Please create a course first via the teacher dashboard.")
                return

            print(f"Linking mock cohort to courses: {[c['title'] for c in courses]}")

            for st in MOCK_STUDENTS:
                # 1. Create or ensure user in neon_auth."user"
                cur.execute('SELECT id FROM neon_auth."user" WHERE email = %s', (st["email"],))
                u = cur.fetchone()
                if not u:
                    st_id = uuid.uuid4()
                    cur.execute(
                        'INSERT INTO neon_auth."user" (id, email, name) VALUES (%s, %s, %s) RETURNING id',
                        (st_id, st["email"], st["name"])
                    )
                else:
                    st_id = u["id"]

                # 2. Assign student role
                cur.execute(
                    """
                    INSERT INTO app.user_roles (user_id, email, role)
                    VALUES (%s, %s, 'student')
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    (st_id, st["email"])
                )

                # 3. Enroll into courses
                for c in courses:
                    cur.execute(
                        """
                        INSERT INTO app.enrollments (course_id, student_id, status, invited_by)
                        VALUES (%s, %s, 'accepted', %s)
                        ON CONFLICT (course_id, student_id) DO NOTHING
                        """,
                        (c["id"], st_id, st_id)
                    )

                    # Initialize student ability (theta) with slight variance per subject
                    if c["subject_id"]:
                        subj_theta = st["ability"] + random.gauss(0, 0.2)
                        cur.execute(
                            """
                            INSERT INTO engine.student_ability (student_id, subject_id, theta, n_attempts)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (student_id, subject_id) DO UPDATE
                            SET theta = EXCLUDED.theta, updated_at = now()
                            """,
                            (st_id, c["subject_id"], round(subj_theta, 3), random.randint(15, 60))
                        )

            # Auto-approve cross course links between these courses for cross-subject demo
            if len(courses) >= 2:
                print("Linking courses in app.course_links with approved status...")
                c1, c2 = courses[0]["id"], courses[1]["id"]
                cur.execute(
                    """
                    INSERT INTO app.course_links (course_a, course_b, requested_by, status)
                    SELECT %s, %s, teacher_id, 'approved'
                    FROM app.courses WHERE id = %s
                    ON CONFLICT (course_a, course_b) DO UPDATE SET status = 'approved'
                    """,
                    (c1, c2, c1)
                )

        conn.commit()
    print("✅ Mock cohort successfully seeded!")

if __name__ == "__main__":
    seed_cohort()
