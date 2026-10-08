from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
import logging

logger = logging.getLogger("revision_engine.fsrs")

try:
    from fsrs import Scheduler, Card, Rating
    _HAS_FSRS = True
except ImportError:
    _HAS_FSRS = False
    logger.warning("py-fsrs library not installed or cannot be imported. Using fallback scheduler.")

def determine_rating(is_correct: bool, rt_z: float, p_mastery: float) -> int:
    """
    Maps attempt correctness, response time z-score, and topic mastery to an FSRS Rating:
    1: Again (Wrong)
    2: Hard (Correct, slow rt_z > +1)
    3: Good (Correct, normal)
    4: Easy (Correct, fast rt_z < -0.5 AND p_mastery > 0.8)
    """
    if not is_correct:
        return 1 # Again
    
    if rt_z > 1.0:
        return 2 # Hard
    
    if (rt_z < -0.5) and (p_mastery > 0.80):
        return 4 # Easy
        
    return 3 # Good

def review_card(
    state: Optional[Dict[str, Any]], 
    rating_val: int, 
    review_time: Optional[datetime] = None
) -> Tuple[Dict[str, Any], datetime]:
    """
    Applies FSRS review transition to the card state.
    Returns (new_state_dict, next_due_datetime).
    """
    now = review_time or datetime.now(timezone.utc)
    
    if _HAS_FSRS:
        try:
            scheduler = Scheduler()
            card = Card.from_dict(state) if state and hasattr(Card, "from_dict") else Card()
            
            # Map integer to Rating enum
            fsrs_rating = Rating(rating_val)
            card, _ = scheduler.review_card(card, fsrs_rating, now)
            
            card_dict = card.to_dict() if hasattr(card, "to_dict") else card.__dict__
            due_at = card.due if hasattr(card, "due") else now + timedelta(days=1)
            return card_dict, due_at
        except Exception as e:
            logger.warning(f"FSRS library execution failed, falling back: {e}")

    # Fallback spaced repetition logic if py-fsrs is unavailable or throws
    reps = (state.get("reps", 0) if state else 0)
    stability = (state.get("stability", 1.0) if state else 1.0)
    
    if rating_val == 1: # Again
        interval_days = 0.5
        reps = 0
        stability = max(0.5, stability * 0.7)
    elif rating_val == 2: # Hard
        interval_days = max(1.0, stability * 1.2)
        reps += 1
    elif rating_val == 3: # Good
        interval_days = max(1.0, stability * 2.5)
        reps += 1
        stability *= 1.5
    else: # Easy
        interval_days = max(2.0, stability * 3.5)
        reps += 1
        stability *= 2.0

    due_at = now + timedelta(days=interval_days)
    new_state = {
        "reps": reps,
        "stability": stability,
        "last_review": now.isoformat(),
        "due": due_at.isoformat()
    }
    return new_state, due_at
