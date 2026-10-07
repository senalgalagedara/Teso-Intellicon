import random
from typing import List, Dict, Any, Tuple, Optional
from app.engine.algorithms.rasch import p_correct

def calculate_candidate_score(
    q: Dict[str, Any],
    theta: float,
    topic_mastery_map: Dict[str, float],
    due_question_ids: set,
    seen_question_ids: set,
    weights: Tuple[float, float, float, float] = (0.4, 0.3, 0.2, 0.1)
) -> Tuple[float, str]:
    w1, w2, w3, w4 = weights
    
    # 1. Topic need: 1 - p_mastery(topic) (default 0.2 if unknown)
    topic_id = str(q.get("topic_id", ""))
    p_mastery = topic_mastery_map.get(topic_id, 0.2)
    topic_need = 1.0 - p_mastery

    # 2. Difficulty fit: target ~70% chance of success
    difficulty_b = float(q.get("difficulty_b", 0.0))
    p_succ = p_correct(theta, difficulty_b)
    diff_fit = max(0.0, 1.0 - (abs(p_succ - 0.70) / 0.70))

    # 3. Due bonus: 1.0 if FSRS card is due
    qid = str(q["id"])
    due_bonus = 1.0 if qid in due_question_ids else 0.0

    # 4. Novelty: small bonus if never seen by student
    novelty = 1.0 if qid not in seen_question_ids else 0.0

    # Small Gaussian noise to avoid deterministic sequences
    noise = random.gauss(0, 0.05)

    total_score = (
        w1 * topic_need +
        w2 * diff_fit +
        w3 * due_bonus +
        w4 * novelty +
        noise
    )

    # Determine explanatory reason
    if due_bonus > 0.5:
        reason = "due for review"
    elif topic_need > 0.4:
        reason = "weak topic reinforcement"
    elif p_succ < 0.60:
        reason = "stretch question"
    elif novelty > 0.5:
        reason = "new concept exploration"
    else:
        reason = "optimal difficulty practice"

    return total_score, reason

def select_next_question(
    candidates: List[Dict[str, Any]],
    theta: float,
    topic_mastery_map: Dict[str, float],
    due_question_ids: set,
    seen_question_ids: set,
    weights: Tuple[float, float, float, float] = (0.4, 0.3, 0.2, 0.1)
) -> Optional[Tuple[Dict[str, Any], str]]:
    if not candidates:
        return None

    scored = []
    for q in candidates:
        score, reason = calculate_candidate_score(
            q=q,
            theta=theta,
            topic_mastery_map=topic_mastery_map,
            due_question_ids=due_question_ids,
            seen_question_ids=seen_question_ids,
            weights=weights
        )
        scored.append((score, reason, q))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    # Sample randomly from top 3 candidates (or fewer if less than 3)
    top_n = scored[:min(3, len(scored))]
    chosen_score, chosen_reason, chosen_q = random.choice(top_n)

    return chosen_q, chosen_reason
