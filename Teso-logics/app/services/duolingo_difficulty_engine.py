"""
TESO — Duolingo-Style Dynamic Question Difficulty & Calibration Engine
File: app/services/duolingo_difficulty_engine.py

Mathematical Formulation:
1. Empirical Bayes Beta-Binomial Smoothing (prevents small-sample volatility):
   smoothed_accuracy = (total_correct + α) / (total_attempts + α + β)
   dynamic_difficulty = 1.0 - smoothed_accuracy

2. Duolingo Birdbrain Logistic IRT & Elo Recalibration:
   Student Ability θ ∈ [-3.0, +3.0] maps to Student Elo: R_S = 1500 + (θ * 200)
   Expected Student Success: E_S = 1 / (1 + 10^((R_Q - R_S) / 400))
   Question Elo Update: ΔR_Q = K * ((1 - Y) - (1 - E_S)) where Y=1 if correct, else 0.
   IRT Parameter b = (R_Q - 1500) / 200 clamped to [-3.0, +3.0]

3. Exam-Level Guessing Dynamics:
   A/L (5 options): P(G) = 0.20
   O/L (4 options): P(G) = 0.25
"""

import math
from typing import Optional, Tuple, Dict, Any
from app.models.revision_models import QuestionBank, ExamLevel

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PRIOR_ALPHA = 2.0         # Pseudo-correct prior count
PRIOR_BETA = 2.0          # Pseudo-incorrect prior count
ELO_K_FACTOR = 16.0       # Dynamic adjustment sensitivity
BASE_ELO = 1500.0         # Baseline question Elo rating
MIN_DIFFICULTY = 0.05
MAX_DIFFICULTY = 0.95


def get_guessing_probability(exam_level: str) -> float:
    """
    Returns the theoretical guessing probability based on question choices count.
    G.C.E. A/L: 5 choices -> P(G) = 1/5 = 0.20
    G.C.E. O/L: 4 choices -> P(G) = 1/4 = 0.25
    """
    if exam_level and exam_level.upper() == ExamLevel.OL.value:
        return 0.25
    return 0.20


def evaluate_answer(
    selected_answer_number: Optional[int],
    correct_answer_number: int,
    additional_correct_answer_number: Optional[int] = None
) -> bool:
    """
    Evaluates whether a student's answer selection is correct.
    Supports primary correct answer, secondary alternative correct answer,
    or bonus/all-correct (-1).
    """
    if selected_answer_number is None:
        return False
    
    # -1 designates bonus/all-correct awarded in marking scheme
    if additional_correct_answer_number == -1:
        return True
    
    if selected_answer_number == correct_answer_number:
        return True
    
    if (
        additional_correct_answer_number is not None
        and additional_correct_answer_number > 0
        and selected_answer_number == additional_correct_answer_number
    ):
        return True
    
    return False


def calculate_smoothed_accuracy(
    total_correct: int,
    total_attempts: int,
    alpha: float = PRIOR_ALPHA,
    beta: float = PRIOR_BETA
) -> float:
    """
    Computes smoothed accuracy using Empirical Bayes Beta-Binomial conjugate prior.
    """
    attempts = max(0, total_attempts)
    correct = max(0, min(attempts, total_correct))
    smoothed = (correct + alpha) / (attempts + alpha + beta)
    return round(float(smoothed), 4)


def calculate_dynamic_difficulty(smoothed_accuracy: float) -> float:
    """
    Converts empirical accuracy into a normalized difficulty score [0.05, 0.95].
    Lower student accuracy = Higher question difficulty score.
    """
    difficulty = 1.0 - smoothed_accuracy
    return round(max(MIN_DIFFICULTY, min(MAX_DIFFICULTY, difficulty)), 4)


def update_question_elo(
    current_question_elo: float,
    student_theta: float,
    is_correct: bool,
    k_factor: float = ELO_K_FACTOR
) -> float:
    """
    Updates the question's Elo rating dynamically using Bradley-Terry/Logistic formulation.
    """
    student_elo = BASE_ELO + (student_theta * 200.0)
    exponent = (current_question_elo - student_elo) / 400.0
    
    # Prevent overflow
    exponent = max(-10.0, min(10.0, exponent))
    expected_student_score = 1.0 / (1.0 + math.pow(10.0, exponent))
    
    # Actual outcome for student: 1 if correct, 0 if wrong
    actual_student_score = 1.0 if is_correct else 0.0
    
    # If student fails, question wins -> Elo increases
    # If student succeeds, question loses -> Elo decreases
    delta_elo = k_factor * (expected_student_score - actual_student_score)
    new_elo = current_question_elo + delta_elo
    return round(max(1000.0, min(2200.0, new_elo)), 2)


def elo_to_irt_b(question_elo: float) -> float:
    """
    Maps continuous Elo rating to the Item Response Theory (IRT) location/difficulty parameter b.
    Typically in range [-3.0, +3.0].
    """
    b = (question_elo - BASE_ELO) / 200.0
    return round(max(-3.0, min(3.0, b)), 3)


def calibrate_question_on_attempt(
    question: QuestionBank,
    student_theta: float,
    is_correct: bool
) -> Dict[str, Any]:
    """
    Recalibrates QuestionBank difficulty metrics in real-time when an attempt is submitted.
    Mutates the question model attributes in place.
    """
    question.total_attempts += 1
    if is_correct:
        question.total_correct += 1

    # 1. Update Empirical Accuracy
    question.historical_accuracy = calculate_smoothed_accuracy(
        total_correct=question.total_correct,
        total_attempts=question.total_attempts
    )

    # 2. Update Dynamic Difficulty Score
    question.difficulty_score = calculate_dynamic_difficulty(question.historical_accuracy)

    # 3. Update Elo Rating
    current_elo = question.elo_rating if question.elo_rating is not None else BASE_ELO
    question.elo_rating = update_question_elo(
        current_question_elo=current_elo,
        student_theta=student_theta,
        is_correct=is_correct
    )

    # 4. Sync IRT parameter b
    question.irt_difficulty_b = elo_to_irt_b(question.elo_rating)

    return {
        "question_id": str(question.id),
        "total_attempts": question.total_attempts,
        "total_correct": question.total_correct,
        "historical_accuracy": question.historical_accuracy,
        "difficulty_score": question.difficulty_score,
        "elo_rating": question.elo_rating,
        "irt_difficulty_b": question.irt_difficulty_b,
    }


def bkt_update_for_level(
    p_mastery: float,
    is_correct: bool,
    exam_level: str,
    p_transit: float = 0.30,
    p_slip: float = 0.10
) -> float:
    """
    Bayesian Knowledge Tracing (BKT) update with dynamic guessing parameter P(G)
    calibrated to the syllabus choice count.
    """
    p_guess = get_guessing_probability(exam_level)
    p_mastery = max(0.01, min(0.99, p_mastery))

    # P(Evidence | L)
    if is_correct:
        p_evidence = p_mastery * (1.0 - p_slip) + (1.0 - p_mastery) * p_guess
    else:
        p_evidence = p_mastery * p_slip + (1.0 - p_mastery) * (1.0 - p_guess)

    p_evidence = max(0.001, p_evidence)

    # Posterior P(L | evidence)
    if is_correct:
        p_known = (p_mastery * (1.0 - p_slip)) / p_evidence
    else:
        p_known = (p_mastery * p_slip) / p_evidence

    # Transition to next state
    p_next = p_known + (1.0 - p_known) * p_transit
    return round(max(0.01, min(0.99, p_next)), 4)
