import math
from typing import Tuple

def compute_rt_z(
    latency_ms: int,
    median_log_rt: float,
    sd_log_rt: float
) -> float:
    """
    Computes normalized response-time z-score on the log scale.
    Clamps latency to >= 100ms to avoid log(0) errors.
    """
    safe_latency = max(100, latency_ms)
    log_rt = math.log(safe_latency)
    safe_sd = max(0.2, sd_log_rt)
    return (log_rt - median_log_rt) / safe_sd

def classify_attempt(
    is_correct: bool,
    rt_z: float,
    peer_facility: float
) -> str:
    """
    Classifies an attempt based on response latency, correctness, and peer facility.
    Possible labels: 'solid', 'lucky_guess', 'careless_error', 'conceptual_gap'
    """
    if is_correct:
        if rt_z < -1.0:
            return "lucky_guess"
        return "solid"

    # Peer facility overrides for incorrect answers
    if peer_facility > 0.85:
        # Missed a peer-easy question -> peer-easy trap / careless slip
        return "careless_error"
    if peer_facility < 0.20:
        # Difficult for the vast majority -> deep conceptual gap
        return "conceptual_gap"

    # Default latency-based classification for incorrect answers
    if rt_z < -0.5:
        return "careless_error"
    return "conceptual_gap"
