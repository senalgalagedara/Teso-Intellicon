import math
from typing import List, Dict, Any, Tuple

def compute_point_biserial(
    item_correctness: List[int],
    total_scores: List[float]
) -> float:
    """
    Computes point-biserial correlation between binary item correctness (0 or 1)
    and continuous total ability / assessment scores.
    r_pb = ((M1 - M0) / S_n) * sqrt(p * q)
    """
    n = len(item_correctness)
    if n < 3:
        return 0.0

    ones = [score for correct, score in zip(item_correctness, total_scores) if correct == 1]
    zeros = [score for correct, score in zip(item_correctness, total_scores) if correct == 0]

    n1 = len(ones)
    n0 = len(zeros)

    if n1 == 0 or n0 == 0:
        return 0.0

    m1 = sum(ones) / n1
    m0 = sum(zeros) / n0

    mean_total = sum(total_scores) / n
    variance = sum((s - mean_total) ** 2 for s in total_scores) / n
    sd_total = math.sqrt(variance)

    if sd_total == 0:
        return 0.0

    p = n1 / n
    q = n0 / n

    return ((m1 - m0) / sd_total) * math.sqrt(p * q)

def analyze_item(
    attempts: List[Dict[str, Any]],
    correct_option: str
) -> Dict[str, Any]:
    """
    Calculates facility, discrimination, distractor distribution, and diagnostic flags.
    """
    n = len(attempts)
    if n == 0:
        return {
            "facility": 0.5,
            "discrimination": 0.0,
            "attempts_count": 0,
            "flags": []
        }

    correct_count = sum(1 for a in attempts if a["is_correct"])
    facility = correct_count / n

    # Compute discrimination using student ability / theta / score
    correctness_series = [1 if a["is_correct"] else 0 for a in attempts]
    score_series = [float(a.get("ability_score", 0.0)) for a in attempts]
    discrimination = compute_point_biserial(correctness_series, score_series)

    # Option frequency analysis for distractors
    option_counts: Dict[str, int] = {}
    for a in attempts:
        opt = str(a.get("chosen_option", ""))
        option_counts[opt] = option_counts.get(opt, 0) + 1

    flags = []
    if facility > 0.90:
        flags.append("too_easy")
    elif facility < 0.20:
        flags.append("too_hard")

    if discrimination < 0.0 and n >= 5:
        flags.append("suspect_key")

    # Check for hot distractors: a wrong option chosen more often than the correct one
    for opt, count in option_counts.items():
        if opt != correct_option and count > correct_count:
            flags.append("hot_distractor")
            break

    return {
        "facility": round(facility, 3),
        "discrimination": round(discrimination, 3),
        "attempts_count": n,
        "flags": flags,
        "option_counts": option_counts
    }
