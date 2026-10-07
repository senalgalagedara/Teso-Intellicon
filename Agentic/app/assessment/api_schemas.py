from typing import Literal
from pydantic import BaseModel, Field
from app.assessment.content import Strict, Question, Resource, Option
from app.assessment.provider import Feedback

State = Literal['queued', 'processing', 'completed', 'partial', 'failed']
class Started(Strict):
    session_id: str
    status: Literal['in_progress', 'submitted']
class DraftSaved(Strict):
    session_id: str
    status: Literal['draft_saved']
class PaperSummary(Strict):
    id: str
    title: str
    version: int
    is_development: bool
    question_count: int
    subject_id: str
    subject_name: str
    content_language: str
class PaperList(Strict):
    papers: list[PaperSummary]
class SessionSummary(Strict):
    id: str
    status: str
    paper_id: str
    started_at: float
class SessionList(Strict):
    sessions: list[SessionSummary]
class ExamQuestion(Strict):
    id: str
    version: int
    text: str
    marks: float
    media_ids: list[str]
    options: list[Option]
class Exam(Strict):
    session_id: str
    status: Literal['in_progress', 'submitted']
    language: str
    questions: list[ExamQuestion]
    plan: dict | None
    drafts: dict[str, str | None]
    is_development: bool
class Counts(Strict):
    correct: int
    incorrect: int
    unanswered: int
    awarded_marks: float
    total_marks: float
    percentage: float
class Submission(Strict):
    session_id: str
    score: Counts
    analysis_status: State
    job_id: str
class Job(Strict):
    job_id: str
    state: State
    attempts: int
    error_code: str | None
class UnitPerformance(Counts):
    unit_id: str
    unit_name: str
class ConceptPerformance(UnitPerformance):
    concept_id: str
    concept_name: str
    evidence_question_ids: list[str]
    recommendation: str
class SuccessRate(Strict):
    population: str
    activity_type: str
    numerator: int
    denominator: int
    percentage: float | None
    sample_label: Literal['no_data', 'small_sample', 'available']
class Answer(Strict):
    session_id: str
    question_id: str
    selected_option: str | None
    answered_at: float | None
    submitted_at: float | None
    duration_ms: int | None
    hint_exposed: bool | None
    solution_exposed: bool | None
    correct: bool | None
    marks: float
    is_final: bool
class Analysis(Strict):
    feedback: Feedback
    status: Literal['ai_generated', 'reviewed_fallback', 'mock']
    fallback_reason: str | None
    provider: str
    model: str
    prompt_version: str
    question_version: int
    resource_versions: dict[str, int]
    analysis_version: int
    generated_at: float
    usage: dict[str, int]
    language: str
    explanation_language: str
class Review(Strict):
    question: Question
    answer: Answer
    success_rate: SuccessRate
    analysis: Analysis | None
    base_explanation: str
    resources: list[Resource]
class Results(Submission):
    is_development: bool
    concepts: list[ConceptPerformance]
    units: list[UnitPerformance]
    revision_concept_ids: list[str]
    questions: list[Review]
    interpretation: str

class NextRequest(Strict):
    question_count: int = Field(default=10, ge=1, le=50)
class History(Strict):
    attempts: list[dict]
    concepts: list[dict]
    completed_count: int
    interpretation: str
class Plan(Strict):
    strategy: str
    source_session_id: str
    paper_id: str
    language: str
    question_ids: list[str]
    question_count: int
    requested_count: int
    repeated_question_ids: list[str]
    target_concept_ids: list[str]
    selections: list[dict]
    warnings: list[str]
    explanation: str

class CheckAnswerRequest(Strict):
    question_id: str
    selected_option: str
    active_duration_ms: int | None = Field(default=None, ge=0, le=86_400_000)

class CheckAnswerResponse(Strict):
    question_id: str
    selected_option: str
    correct_option_id: str
    is_correct: bool
    marks: float
    total_marks: float
    base_explanation: str
    resources: list[Resource] = []
