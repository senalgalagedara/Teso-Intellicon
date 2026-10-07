import math
import random
from typing import List, Dict, Any, Tuple

def compute_subject_zscores(
    student_scores: Dict[str, float] # student_id -> raw score or theta
) -> Dict[str, Tuple[float, float, float]]: # student_id -> (z_score, mean, std)
    """
    Computes standard z-scores: z = (x - mean) / std over the cohort for one subject.
    """
    if not student_scores:
        return {}

    scores = list(student_scores.values())
    n = len(scores)
    mean = sum(scores) / n
    variance = sum((s - mean) ** 2 for s in scores) / n if n > 1 else 1.0
    std = math.sqrt(variance) if variance > 1e-6 else 1.0

    results = {}
    for sid, val in student_scores.items():
        z = (val - mean) / std
        results[sid] = (round(z, 3), mean, std)
    return results

def project_composite_zscore_monte_carlo(
    subject_stats: Dict[str, Tuple[float, float]], # subject -> (recent_mean, recent_std)
    n_samples: int = 1000
) -> Dict[str, float]:
    """
    Runs Monte Carlo simulation drawing each subject score from Normal(recent_mean, recent_std)
    and computing percentiles P10, P50 (median), P90 for composite projection.
    """
    if not subject_stats:
        return {"p10": 0.0, "p50": 0.0, "p90": 0.0}

    samples = []
    for _ in range(n_samples):
        sample_sum = 0.0
        for s_mean, s_std in subject_stats.values():
            val = random.gauss(s_mean, max(0.1, s_std))
            sample_sum += val
        composite = sample_sum / len(subject_stats)
        samples.append(composite)

    samples.sort()
    idx_p10 = int(0.10 * n_samples)
    idx_p50 = int(0.50 * n_samples)
    idx_p90 = int(0.90 * n_samples)

    return {
        "p10": round(samples[idx_p10], 3),
        "p50": round(samples[idx_p50], 3),
        "p90": round(samples[idx_p90], 3)
    }

def flag_student_zscores(
    composite_p50: float,
    composite_p90: float,
    subject_z_map: Dict[str, float],
    cohort_top_1_threshold: float,
    at_risk_cutoff: float = -0.75
) -> List[str]:
    """
    Flags:
    - island_rank_contender: P50 composite in the cohort's top 1%
    - at_risk: P90 composite below cutoff OR any subject z < -1.0
    """
    flags = []
    if composite_p50 >= cohort_top_1_threshold:
        flags.append("island_rank_contender")

    is_at_risk = False
    if composite_p90 < at_risk_cutoff:
        is_at_risk = True
    for z in subject_z_map.values():
        if z < -1.0:
            is_at_risk = True
            break

    if is_at_risk:
        flags.append("at_risk")

    return flags
