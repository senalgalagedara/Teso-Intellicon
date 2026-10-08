#!/usr/bin/env python3
"""
Seed script: creates standard subjects, topics, and sample A/L questions in the database.
Usage: python scripts/seed_questions.py
"""

import os
import json
import psycopg
from psycopg.rows import dict_row

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    print("Error: DATABASE_URL not set in environment.")
    exit(1)

SAMPLE_SUBJECTS = [
    {"name": "Physics", "stream": "Physical Science"},
    {"name": "Combined Mathematics", "stream": "Physical Science"},
    {"name": "Chemistry", "stream": "Physical Science & Bio Science"},
]

SAMPLE_TOPICS = [
    # Physics
    {"subject": "Physics", "parent": None, "name": "Mechanics"},
    {"subject": "Physics", "parent": "Mechanics", "name": "Circular Motion & Gravitation"},
    {"subject": "Physics", "parent": "Mechanics", "name": "Simple Harmonic Motion"},
    {"subject": "Physics", "parent": None, "name": "Thermal Physics"},
    {"subject": "Physics", "parent": None, "name": "Current Electricity"},
    
    # Combined Maths
    {"subject": "Combined Mathematics", "parent": None, "name": "Calculus"},
    {"subject": "Combined Mathematics", "parent": "Calculus", "name": "Integration & Definite Integrals"},
    {"subject": "Combined Mathematics", "parent": None, "name": "Trigonometry"},
]

SAMPLE_QUESTIONS = [
    {
        "subject": "Physics",
        "topic": "Simple Harmonic Motion",
        "stem": "A particle of mass m executes Simple Harmonic Motion (SHM) with amplitude A and angular frequency ω. At a displacement of x = A/2 from the equilibrium position, what is the ratio of its kinetic energy (K) to its potential energy (U)?",
        "options": [
            {"id": "A", "text": "1 : 3"},
            {"id": "B", "text": "3 : 1"},
            {"id": "C", "text": "1 : 1"},
            {"id": "D", "text": "4 : 1"}
        ],
        "correct_option": "B",
        "teacher_difficulty": 2,
        "explanation": "Potential energy U = 1/2 m ω² x² = 1/2 m ω² (A/2)² = 1/8 m ω² A². Total energy E = 1/2 m ω² A². Thus kinetic energy K = E - U = 3/8 m ω² A². Therefore, K / U = (3/8) / (1/8) = 3 : 1."
    },
    {
        "subject": "Physics",
        "topic": "Circular Motion & Gravitation",
        "stem": "A satellite moves in a circular orbit around the Earth at height h above the Earth's surface. If the orbital radius is doubled, what happens to its orbital period T?",
        "options": [
            {"id": "A", "text": "Increases by a factor of 2"},
            {"id": "B", "text": "Increases by a factor of 2√2"},
            {"id": "C", "text": "Decreases by a factor of 2"},
            {"id": "D", "text": "Increases by a factor of 4"}
        ],
        "correct_option": "B",
        "teacher_difficulty": 1,
        "explanation": "According to Kepler's Third Law, T² ∝ r³. If r' = 2r, then (T'/T)² = (2)³ = 8, so T' = √8 T = 2√2 T."
    },
    {
        "subject": "Combined Mathematics",
        "topic": "Integration & Definite Integrals",
        "stem": "What is the value of the definite integral ∫ from 0 to π/2 of (sin x) / (sin x + cos x) dx?",
        "options": [
            {"id": "A", "text": "π / 4"},
            {"id": "B", "text": "π / 2"},
            {"id": "C", "text": "1"},
            {"id": "D", "text": "0"}
        ],
        "correct_option": "A",
        "teacher_difficulty": 2,
        "explanation": "Using King's property: ∫_0^a f(x) dx = ∫_0^a f(a - x) dx. Adding both integrals gives 2I = ∫_0^(π/2) 1 dx = π/2. Therefore, I = π/4."
    }
]

def seed():
    with psycopg.connect(DB_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            print("Seeding subjects...")
            subj_ids = {}
            for s in SAMPLE_SUBJECTS:
                cur.execute(
                    """
                    INSERT INTO app.subjects (name, stream)
                    VALUES (%s, %s)
                    ON CONFLICT (name) DO UPDATE SET stream = EXCLUDED.stream
                    RETURNING id, name
                    """,
                    (s["name"], s["stream"])
                )
                row = cur.fetchone()
                subj_ids[row["name"]] = row["id"]

            print("Seeding topics...")
            topic_ids = {}
            for t in SAMPLE_TOPICS:
                s_id = subj_ids[t["subject"]]
                parent_id = topic_ids.get(t["parent"]) if t["parent"] else None
                cur.execute(
                    """
                    INSERT INTO app.topics (subject_id, parent_id, name)
                    VALUES (%s, %s, %s)
                    RETURNING id, name
                    """,
                    (s_id, parent_id, t["name"])
                )
                row = cur.fetchone()
                topic_ids[row["name"]] = row["id"]

            # Find a default teacher user to author the questions
            cur.execute("SELECT user_id FROM app.user_roles WHERE role = 'teacher' LIMIT 1")
            teacher = cur.fetchone()
            if not teacher:
                cur.execute('SELECT id as user_id FROM neon_auth."user" LIMIT 1')
                teacher = cur.fetchone()

            if not teacher:
                print("Notice: No users found in neon_auth.user. Please sign up a user first before adding sample questions.")
                conn.commit()
                return

            author_id = teacher["user_id"]

            print("Seeding starter questions...")
            for q in SAMPLE_QUESTIONS:
                s_id = subj_ids[q["subject"]]
                t_id = topic_ids.get(q["topic"])
                cur.execute(
                    """
                    INSERT INTO app.questions (
                        subject_id, topic_id, author_id, stem, options,
                        correct_option, explanation, teacher_difficulty, active
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true)
                    """,
                    (
                        s_id, t_id, author_id, q["stem"],
                        json.dumps(q["options"]), q["correct_option"],
                        q["explanation"], q["teacher_difficulty"]
                    )
                )

        conn.commit()
    print("✅ Seed completed successfully!")

if __name__ == "__main__":
    seed()
