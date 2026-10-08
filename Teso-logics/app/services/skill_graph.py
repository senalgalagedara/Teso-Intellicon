"""
TESO — Skill Graph Service
============================
Manages the Chemistry A/L directed skill graph:
  - Prerequisite checking
  - Skill unlocking logic
  - Graph state computation for the frontend
  - On-startup seeding from skill_data.py
"""

from typing import List, Dict, Optional, Set
from sqlalchemy.orm import Session

from app.models.adaptive_models import Skill, SkillPrerequisite, UserSkillState
from app.core.skill_data import CHEMISTRY_SKILLS

MASTERY_UNLOCK_THRESHOLD = 0.65   # prerequisite must be at least this mastered to unlock


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------

def seed_skills(db: Session) -> None:
    """
    Seed the skills and skill_prerequisites tables from skill_data.py.
    Idempotent — skips if already seeded.
    """
    existing_count = db.query(Skill).count()
    if existing_count >= len(CHEMISTRY_SKILLS):
        return   # already seeded

    # Step 1: Create all skills first
    skill_key_to_id: Dict[str, str] = {}
    for skill_def in CHEMISTRY_SKILLS:
        existing = db.query(Skill).filter(
            Skill.name == skill_def["name"],
            Skill.subject == skill_def.get("subject", "Chemistry"),
        ).first()
        if existing:
            skill_key_to_id[skill_def["key"]] = str(existing.id)
            continue

        skill = Skill(
            name=skill_def["name"],
            description=skill_def.get("description"),
            unit=skill_def.get("unit"),
            subject=skill_def.get("subject", "Chemistry"),
            difficulty=skill_def.get("difficulty", "medium"),
            estimated_hours=skill_def.get("estimated_hours"),
            syllabus_weight=skill_def.get("syllabus_weight", 0.0),
            lesson_ids=skill_def.get("lesson_ids", []),
            is_active=True,
        )
        db.add(skill)
        db.flush()
        skill_key_to_id[skill_def["key"]] = str(skill.id)

    db.commit()

    # Step 2: Create prerequisite edges
    for skill_def in CHEMISTRY_SKILLS:
        skill_id = skill_key_to_id.get(skill_def["key"])
        if not skill_id:
            continue
        for prereq_key in skill_def.get("prerequisites", []):
            prereq_id = skill_key_to_id.get(prereq_key)
            if not prereq_id:
                continue
            # Check if edge already exists
            exists = db.query(SkillPrerequisite).filter(
                SkillPrerequisite.skill_id == skill_id,
                SkillPrerequisite.prerequisite_skill_id == prereq_id,
            ).first()
            if not exists:
                edge = SkillPrerequisite(
                    skill_id=skill_id,
                    prerequisite_skill_id=prereq_id,
                    strength=1.0,
                )
                db.add(edge)
    db.commit()


# ---------------------------------------------------------------------------
# Prerequisites Logic
# ---------------------------------------------------------------------------

def get_prerequisites(skill_id: str, db: Session) -> List[Skill]:
    """Return all prerequisite skills for a given skill."""
    edges = (
        db.query(SkillPrerequisite)
        .filter(SkillPrerequisite.skill_id == skill_id)
        .all()
    )
    prereq_ids = [e.prerequisite_skill_id for e in edges]
    if not prereq_ids:
        return []
    return db.query(Skill).filter(Skill.id.in_(prereq_ids)).all()


def check_prerequisites_met(user_id: str, skill_id: str, db: Session) -> bool:
    """
    Return True if all prerequisite skills are sufficiently mastered
    (mastery_probability >= MASTERY_UNLOCK_THRESHOLD) or if there are none.
    """
    prereqs = get_prerequisites(skill_id, db)
    if not prereqs:
        return True   # No prerequisites → always unlocked

    for prereq in prereqs:
        state = (
            db.query(UserSkillState)
            .filter(
                UserSkillState.user_id == user_id,
                UserSkillState.skill_id == prereq.id,
            )
            .first()
        )
        if not state or state.mastery_probability < MASTERY_UNLOCK_THRESHOLD:
            return False
    return True


def unlock_eligible_skills(user_id: str, db: Session) -> List[str]:
    """
    Check all locked skills and unlock those whose prerequisites are met.
    Returns list of newly unlocked skill IDs.
    """
    all_skills = db.query(Skill).filter(Skill.is_active == True).all()
    newly_unlocked = []

    for skill in all_skills:
        state = (
            db.query(UserSkillState)
            .filter(
                UserSkillState.user_id == user_id,
                UserSkillState.skill_id == skill.id,
            )
            .first()
        )
        if state and state.is_unlocked:
            continue   # already unlocked

        if check_prerequisites_met(user_id, str(skill.id), db):
            if state:
                state.is_unlocked = True
            else:
                state = UserSkillState(
                    user_id=user_id,
                    skill_id=skill.id,
                    is_unlocked=True,
                )
                db.add(state)
            newly_unlocked.append(str(skill.id))

    if newly_unlocked:
        db.commit()
    return newly_unlocked


# ---------------------------------------------------------------------------
# Skill Graph State
# ---------------------------------------------------------------------------

def get_skill_graph_state(user_id: str, db: Session) -> dict:
    """
    Build the full skill graph with per-node mastery overlaid.
    Used by the /skills/graph endpoint.
    """
    all_skills = db.query(Skill).filter(Skill.is_active == True).all()
    all_edges = db.query(SkillPrerequisite).all()

    # Build adjacency maps
    prereq_map: Dict[str, List[str]] = {}    # skill_id → list of prereq ids
    dependent_map: Dict[str, List[str]] = {} # skill_id → list of dependent ids
    for edge in all_edges:
        sid = str(edge.skill_id)
        pid = str(edge.prerequisite_skill_id)
        prereq_map.setdefault(sid, []).append(pid)
        dependent_map.setdefault(pid, []).append(sid)

    # Get all user states
    user_states = {
        str(s.skill_id): s
        for s in db.query(UserSkillState).filter(UserSkillState.user_id == user_id).all()
    }

    nodes = []
    mastered_count = 0
    in_progress_count = 0
    unlocked_count = 0
    total_mastery = 0.0

    for skill in all_skills:
        sid = str(skill.id)
        state = user_states.get(sid)
        mastery = state.mastery_probability if state else 0.0
        is_unlocked = state.is_unlocked if state else check_prerequisites_met(user_id, sid, db)
        is_mastered = state.is_mastered if state else False

        nodes.append({
            "skill": skill,
            "mastery_probability": mastery,
            "memory_strength": state.memory_strength if state else 0.0,
            "is_unlocked": is_unlocked,
            "is_mastered": is_mastered,
            "next_revision_due": state.next_revision_due if state else None,
            "prerequisites": prereq_map.get(sid, []),
            "dependents": dependent_map.get(sid, []),
        })

        total_mastery += mastery
        if is_mastered:
            mastered_count += 1
        elif is_unlocked and (state and state.total_attempts > 0):
            in_progress_count += 1
        if is_unlocked:
            unlocked_count += 1

    overall_mastery = total_mastery / len(all_skills) if all_skills else 0.0

    return {
        "user_id": user_id,
        "nodes": nodes,
        "total_skills": len(all_skills),
        "mastered_count": mastered_count,
        "in_progress_count": in_progress_count,
        "unlocked_count": unlocked_count,
        "overall_mastery": round(overall_mastery, 4),
    }


def get_unlocked_skills(user_id: str, db: Session) -> List[dict]:
    """Return all unlocked but not yet mastered skills, ready to learn."""
    graph = get_skill_graph_state(user_id, db)
    return [
        n for n in graph["nodes"]
        if n["is_unlocked"] and not n["is_mastered"]
    ]
