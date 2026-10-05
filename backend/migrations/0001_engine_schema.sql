-- ==============================================================================
-- Revision Engine: Engine-Side Schema Migration (0001_engine_schema.sql)
-- Owned by FastAPI Revision Engine layer.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS engine;

-- 1. Student Rasch Ability (theta per student per subject)
CREATE TABLE IF NOT EXISTS engine.student_ability (
    student_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    theta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    n_attempts INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, subject_id)
);

-- 2. Question Rasch Rating & Response Time Statistics
CREATE TABLE IF NOT EXISTS engine.question_rating (
    question_id UUID PRIMARY KEY,
    difficulty_b DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    n_attempts INT NOT NULL DEFAULT 0,
    median_log_rt DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    sd_log_rt DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    facility DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    discrimination DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Bayesian Knowledge Tracing (BKT) Sub-topic Mastery
CREATE TABLE IF NOT EXISTS engine.topic_mastery (
    student_id UUID NOT NULL,
    topic_id UUID NOT NULL,
    p_mastery DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    n_obs INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, topic_id)
);

CREATE INDEX IF NOT EXISTS topic_mastery_student_idx ON engine.topic_mastery (student_id);

-- 4. FSRS Spaced-Repetition Cards
CREATE TABLE IF NOT EXISTS engine.fsrs_card (
    student_id UUID NOT NULL,
    question_id UUID NOT NULL,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_review_at TIMESTAMPTZ,
    PRIMARY KEY (student_id, question_id)
);

CREATE INDEX IF NOT EXISTS fsrs_card_due_idx ON engine.fsrs_card (student_id, due_at);

-- 5. Attempt Diagnosis Output (Classifier)
CREATE TABLE IF NOT EXISTS engine.attempt_diagnosis (
    attempt_id UUID PRIMARY KEY,
    label TEXT NOT NULL,
    rt_z DOUBLE PRECISION NOT NULL,
    peer_facility DOUBLE PRECISION NOT NULL
);

-- 6. Idempotency Log (prevents duplicate attempts processing)
CREATE TABLE IF NOT EXISTS engine.engine_processed (
    attempt_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
