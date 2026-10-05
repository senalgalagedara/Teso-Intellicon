from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class NextQuestionRequest(BaseModel):
    student_id: str
    course_id: str

class NextQuestionResponse(BaseModel):
    question_id: str
    reason: str

class ProcessAttemptRequest(BaseModel):
    attempt_id: str

class ProcessAttemptResponse(BaseModel):
    label: str
    p_mastery: float
    next_due_at: Optional[datetime] = None

class DueReviewItem(BaseModel):
    question_id: str
    retrievability: float
    due_at: datetime

class TopicMasteryItem(BaseModel):
    topic_id: str
    topic_name: str
    p_mastery: float
    status: str # "weak" (<0.6), "progressing", "mastered" (>=0.95)

class StudentProgressResponse(BaseModel):
    student_id: str
    theta: float
    review_load: int
    topic_mastery: List[TopicMasteryItem]
    weak_topics: List[str]

class PeerDiagnosticItem(BaseModel):
    question_id: str
    stem: str
    chosen_option: str
    correct_option: str
    peer_facility: float
    latency_ms: int
    diagnosis_label: str

class PeerDiagnosticResponse(BaseModel):
    session_id: Optional[str] = None
    missed_peer_easy: List[PeerDiagnosticItem] # peer facility > 0.85
    cohort_hard: List[PeerDiagnosticItem] # peer facility < 0.20

class ItemStatItem(BaseModel):
    question_id: str
    stem: str
    facility: float
    discrimination: float
    attempts_count: int
    flags: List[str] # too_easy, too_hard, suspect_key, hot_distractor

class ItemStatsResponse(BaseModel):
    course_id: str
    items: List[ItemStatItem]

class ZScoreBand(BaseModel):
    p10: float
    p50: float
    p90: float

class StudentZScoreItem(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    subject_z: Dict[str, float]
    composite_z: float
    band: ZScoreBand
    flags: List[str] # "island_rank_contender", "at_risk"

class ZScoresResponse(BaseModel):
    course_id: str
    students: List[StudentZScoreItem]

class JobRunResponse(BaseModel):
    job: str
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None
