// Contract: Agentic/app/assessment/api_schemas.py and /openapi.json.
export type AnalysisState = "queued" | "processing" | "completed" | "partial" | "failed";
export type Option = { id: string; text: string; media_ids: string[] };
export type Question = { id: string; version: number; text: string; marks: number; media_ids: string[]; options: Option[] };
export type Exam = { session_id: string; status: "in_progress" | "submitted"; language: string; is_development: boolean; questions: Question[]; drafts: Record<string, string | null> };
export type Paper = { id: string; title: string; version: number; is_development: boolean; question_count: number };
export type Session = { id: string; paper_id: string; status: string; started_at: number };
export type Score = { correct: number; incorrect: number; unanswered: number; awarded_marks: number; total_marks: number; percentage: number };
export type Concept = { concept_id: string; concept_name: string; unit_id: string; unit_name: string; correct: number; incorrect: number; unanswered: number; percentage: number; recommendation: string; evidence_question_ids: string[] };
export type Resource = { id: string; title: string; theory: string; url: string | null };
export type Analysis = { status: "mock" | "ai_generated" | "reviewed_fallback"; fallback_reason: string | null; provider: string; model: string; explanation_language: string; feedback: { explanation: string; worked_solution: string | null; selected_option_explanation: string | null; possible_misconception: string | null; revision_action: string; evidence_ids: string[] } };
export type Review = { question: Question & { correct_option_id: string; solution_media_ids: string[] }; answer: { selected_option: string | null; correct: boolean | null; marks: number }; base_explanation: string; analysis: Analysis | null; resources: Resource[]; success_rate: { percentage: number | null; numerator: number; denominator: number; sample_label: string; population: string } };
export type Result = { session_id: string; score: Score; analysis_status: AnalysisState; is_development: boolean; concepts: Concept[]; revision_concept_ids: string[]; questions: Review[]; interpretation: string };
