import math
from typing import Tuple

def p_correct(theta: float, b: float) -> float:
    """
    Computes Rasch probability of correct response: P(correct) = 1 / (1 + exp(-(theta - b))).
    Clamped to prevent overflow.
    """
    diff = max(-20.0, min(20.0, theta - b))
    return 1.0 / (1.0 + math.exp(-diff))

def k_factor(n: int, k0: float = 0.4, k_min: float = 0.05, n0: int = 30) -> float:
    """
    Adaptive learning rate: larger updates initially, stabilizing as observations accumulate.
    """
    return max(k_min, k0 / (1.0 + float(n) / float(n0)))

def update(theta: float, b: float, y: int, n_student: int, n_question: int) -> Tuple[float, float]:
    """
    Online Rasch Elo-style update for student ability (theta) and question difficulty (b).
    Both theta and b are bounded to [-4.0, 4.0].
    """
    err = float(y) - p_correct(theta, b)
    new_theta = theta + k_factor(n_student) * err
    new_b = b - k_factor(n_question) * err

    # Clamp to [-4.0, 4.0]
    new_theta = max(-4.0, min(4.0, new_theta))
    new_b = max(-4.0, min(4.0, new_b))

    return new_theta, new_b

def initial_b(teacher_difficulty: int) -> float:
    """
    Cold start mapping from teacher difficulty (1, 2, 3) to Rasch b:
    1 -> -1.0, 2 -> 0.0, 3 -> +1.0
    """
    mapping = {1: -1.0, 2: 0.0, 3: 1.0}
    return mapping.get(teacher_difficulty, 0.0)
