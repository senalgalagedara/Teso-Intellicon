"""
TESO — Multi-Subject Database Seeder
File: app/core/revision_seeder.py
Populates A/L and O/L subjects, topics, subtopics, and calibrated questions.
"""

import uuid
import logging
from sqlalchemy.orm import Session
from app.models.revision_models import (
    Subject, SubjectTopic, SubjectSubtopic, QuestionBank, ExamLevel
)

logger = logging.getLogger(__name__)

INITIAL_SUBJECTS = [
    {
        "code": "AL_CHEM",
        "name": "Chemistry (A/L)",
        "exam_level": "AL",
        "stream": "Physical / Biological Science",
        "topics": [
            {
                "topic_number": 1.0,
                "name": "Atomic Structure",
                "syllabus_weight": 5.8,
                "subtopics": [
                    {"code": "1.1", "name": "Fundamental Particles & Electronic Structure"},
                    {"code": "1.2", "name": "Electronegativity, Ionization Energy & Trends"},
                    {"code": "1.3", "name": "Wave-Particle Duality & Quantum Numbers"},
                ]
            },
            {
                "topic_number": 2.0,
                "name": "Chemical Bonding & Structure",
                "syllabus_weight": 5.8,
                "subtopics": [
                    {"code": "2.1", "name": "Ionic, Covalent & Metallic Bonding"},
                    {"code": "2.2", "name": "VSEPR Theory & Molecular Geometry"},
                    {"code": "2.3", "name": "Intermolecular Forces & Hydrogen Bonding"},
                ]
            }
        ]
    },
    {
        "code": "AL_PHYS",
        "name": "Physics (A/L)",
        "exam_level": "AL",
        "stream": "Physical / Biological Science",
        "topics": [
            {
                "topic_number": 1.0,
                "name": "Measurement & Units",
                "syllabus_weight": 4.0,
                "subtopics": [
                    {"code": "P1.1", "name": "Dimensions & Error Analysis"},
                    {"code": "P1.2", "name": "Vernier Caliper & Micrometer Screw Gauge"},
                ]
            },
            {
                "topic_number": 2.0,
                "name": "Mechanics",
                "syllabus_weight": 14.0,
                "subtopics": [
                    {"code": "P2.1", "name": "Kinematics & Projectile Motion"},
                    {"code": "P2.2", "name": "Newton's Laws & Momentum Conservation"},
                    {"code": "P2.3", "name": "Work, Energy & Power"},
                ]
            }
        ]
    },
    {
        "code": "AL_CMATH",
        "name": "Combined Mathematics (A/L)",
        "exam_level": "AL",
        "stream": "Physical Science",
        "topics": [
            {
                "topic_number": 1.0,
                "name": "Real Numbers & Functions",
                "syllabus_weight": 6.0,
                "subtopics": [
                    {"code": "M1.1", "name": "Quadratic Equations & Roots"},
                    {"code": "M1.2", "name": "Inequalities & Absolute Values"},
                ]
            }
        ]
    },
    {
        "code": "OL_SCI",
        "name": "Science (O/L)",
        "exam_level": "OL",
        "stream": "General",
        "topics": [
            {
                "topic_number": 1.0,
                "name": "Living World & Classification",
                "syllabus_weight": 8.0,
                "subtopics": [
                    {"code": "OS1.1", "name": "Cellular Structure & Plant Tissues"},
                    {"code": "OS1.2", "name": "Photosynthesis & Cellular Respiration"},
                ]
            },
            {
                "topic_number": 2.0,
                "name": "Matter & Chemical Reactions",
                "syllabus_weight": 8.0,
                "subtopics": [
                    {"code": "OS2.1", "name": "Acids, Bases and Salts"},
                    {"code": "OS2.2", "name": "Newton's Laws of Motion (Introductory)"},
                ]
            }
        ]
    }
]


def seed_revision_database(db: Session) -> None:
    """
    Seeds multi-subject curriculum and sample questions if not already present.
    """
    if db.query(Subject).count() > 0:
        logger.info("TESO: Revision subjects already initialized.")
        return

    logger.info("TESO: Seeding multi-subject revision curriculum...")

    for subj_data in INITIAL_SUBJECTS:
        subject = Subject(
            code=subj_data["code"],
            name=subj_data["name"],
            exam_level=subj_data["exam_level"],
            stream=subj_data.get("stream"),
            is_active=True,
        )
        db.add(subject)
        db.flush()

        for t_idx, topic_data in enumerate(subj_data["topics"]):
            topic = SubjectTopic(
                subject_id=subject.id,
                topic_number=topic_data["topic_number"],
                name=topic_data["name"],
                syllabus_weight=topic_data["syllabus_weight"],
                order_index=t_idx,
                is_active=True,
            )
            db.add(topic)
            db.flush()

            for st_idx, st_data in enumerate(topic_data["subtopics"]):
                subtopic = SubjectSubtopic(
                    topic_id=topic.id,
                    subtopic_code=st_data["code"],
                    name=st_data["name"],
                    order_index=st_idx,
                    is_active=True,
                )
                db.add(subtopic)
                db.flush()

                # Seed sample calibrated questions for each subtopic
                if subject.exam_level == "AL":
                    # A/L Question 1: 5 choices, single correct
                    q1 = QuestionBank(
                        subject_id=subject.id,
                        topic_id=topic.id,
                        subtopic_id=subtopic.id,
                        exam_level="AL",
                        question_text=f"Which of the following is correct regarding {st_data['name']}?",
                        question_image_url=None,
                        answer_1_text="Statement A is completely valid under standard conditions",
                        answer_1_image_url=None,
                        answer_2_text="Statement B shows exponential decay with temperature",
                        answer_2_image_url=None,
                        answer_3_text="Statement C is false due to thermodynamic instability",
                        answer_3_image_url=None,
                        answer_4_text="Statement D only applies to transition metals",
                        answer_4_image_url=None,
                        answer_5_text="Statement E is the universally accepted empirical relationship",
                        answer_5_image_url=None,
                        correct_answer_number=1,
                        additional_correct_answer_number=None,
                        explanation_text=f"Detailed theoretical justification for {st_data['name']}.",
                        difficulty_score=0.45,
                        elo_rating=1480.0,
                        irt_difficulty_b=-0.1,
                        time_limit_seconds=90,
                        is_active=True,
                    )
                    # A/L Question 2: 5 choices, dual-correct accepted answer
                    q2 = QuestionBank(
                        subject_id=subject.id,
                        topic_id=topic.id,
                        subtopic_id=subtopic.id,
                        exam_level="AL",
                        question_text=f"Consider the experimental observations in {st_data['name']}. Which deduction(s) are correct?",
                        question_image_url=None,
                        answer_1_text="Magnitude decreases monotonically across Period 3",
                        answer_1_image_url=None,
                        answer_2_text="Deduction II is verified by spectral analysis (Accepted)",
                        answer_2_image_url=None,
                        answer_3_text="Deduction III violates Hund's multiplicity rule",
                        answer_3_image_url=None,
                        answer_4_text="Deduction IV is also valid under alternative marking criteria (Accepted)",
                        answer_4_image_url=None,
                        answer_5_text="None of the deductions are supported by empirical data",
                        answer_5_image_url=None,
                        correct_answer_number=2,
                        additional_correct_answer_number=4,  # Both 2 and 4 valid!
                        explanation_text="Dual-key question: Both Option 2 and Option 4 receive full marks according to official marking scheme.",
                        difficulty_score=0.72,
                        elo_rating=1620.0,
                        irt_difficulty_b=0.6,
                        time_limit_seconds=90,
                        is_active=True,
                    )
                    db.add_all([q1, q2])

                else:
                    # O/L Question: 4 choices
                    q_ol = QuestionBank(
                        subject_id=subject.id,
                        topic_id=topic.id,
                        subtopic_id=subtopic.id,
                        exam_level="OL",
                        question_text=f"Regarding {st_data['name']}, select the correct statement:",
                        question_image_url=None,
                        answer_1_text="Option 1: Correct baseline fact",
                        answer_1_image_url=None,
                        answer_2_text="Option 2: Incorrect hypothesis",
                        answer_2_image_url=None,
                        answer_3_text="Option 3: Incomplete proposition",
                        answer_3_image_url=None,
                        answer_4_text="Option 4: Outdated assumption",
                        answer_4_image_url=None,
                        answer_5_text=None,  # Null for OL
                        answer_5_image_url=None,
                        correct_answer_number=1,
                        additional_correct_answer_number=None,
                        explanation_text=f"Basic concept explanation for O/L {st_data['name']}.",
                        difficulty_score=0.35,
                        elo_rating=1400.0,
                        irt_difficulty_b=-0.5,
                        time_limit_seconds=60,
                        is_active=True,
                    )
                    db.add(q_ol)

    db.commit()
    logger.info("TESO: Multi-subject curriculum & questions seeded successfully.")
