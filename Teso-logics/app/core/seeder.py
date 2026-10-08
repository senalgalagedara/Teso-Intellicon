"""
TESO — Database Seeding Coordinator
======================================
Seeds skills and questions from seed data files on startup.
Idempotent — safe to call multiple times.
"""

import logging
from sqlalchemy.orm import Session

from app.core.skill_data import CHEMISTRY_SKILLS
from app.core.question_data import QUESTIONS_DATA
from app.models.adaptive_models import Skill, Question
from app.services.skill_graph import seed_skills

logger = logging.getLogger(__name__)


def seed_all(db: Session) -> None:
    """Main entry point: seed skills, then questions."""
    logger.info("TESO: Running seed check...")
    seed_skills(db)
    logger.info("TESO: Skills seeded.")
    _seed_questions(db)
    logger.info("TESO: Questions seeded.")


def _seed_questions(db: Session) -> None:
    """Seed question bank from question_data.py. Idempotent."""
    existing_count = db.query(Question).count()
    if existing_count >= len(QUESTIONS_DATA):
        return  # already seeded

    # Build skill name→key lookup
    skill_key_to_id: dict = {}
    for skill_def in CHEMISTRY_SKILLS:
        skill = db.query(Skill).filter(Skill.name == skill_def["name"]).first()
        if skill:
            skill_key_to_id[skill_def["key"]] = str(skill.id)

    seeded = 0
    for q_def in QUESTIONS_DATA:
        skill_key = q_def.get("skill_key")
        skill_id = skill_key_to_id.get(skill_key)
        if not skill_id:
            continue  # skill not found — skip

        # Check if question already exists (match by text)
        existing = db.query(Question).filter(
            Question.text == q_def["text"]
        ).first()
        if existing:
            continue

        question = Question(
            skill_id=skill_id,
            text=q_def["text"],
            option_a=q_def["option_a"],
            option_b=q_def["option_b"],
            option_c=q_def.get("option_c"),
            option_d=q_def.get("option_d"),
            correct_answer=q_def["correct_answer"],
            explanation=q_def.get("explanation"),
            difficulty=q_def.get("difficulty", "medium"),
            difficulty_score=q_def.get("difficulty_score", 0.5),
            time_limit_seconds=q_def.get("time_limit_seconds", 90),
            tags=[],
            is_active=True,
        )
        db.add(question)
        seeded += 1

    if seeded > 0:
        db.commit()
        logger.info(f"TESO: Seeded {seeded} questions.")
