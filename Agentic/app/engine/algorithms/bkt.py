def update(
    p_l: float, 
    correct: bool, 
    g: float = 0.2, 
    s: float = 0.1, 
    t: float = 0.15
) -> float:
    """
    Standard Bayesian Knowledge Tracing (BKT) update.
    p_l: prior probability of mastery (P(L_t))
    g: probability of guess (P(G))
    s: probability of slip (P(S))
    t: probability of transition/learning (P(T))
    """
    p_l = max(0.01, min(0.99, p_l))
    if correct:
        denom = p_l * (1.0 - s) + (1.0 - p_l) * g
        post = (p_l * (1.0 - s)) / denom if denom > 0 else p_l
    else:
        denom = p_l * s + (1.0 - p_l) * (1.0 - g)
        post = (p_l * s) / denom if denom > 0 else p_l

    # Learning step
    p_new = post + (1.0 - post) * t
    return max(0.01, min(0.999, p_new))

def mastery_status(p_mastery: float) -> str:
    """
    Returns UI category based on mastery probability.
    """
    if p_mastery >= 0.95:
        return "mastered"
    elif p_mastery < 0.60:
        return "weak"
    return "progressing"
