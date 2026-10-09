-- ==============================================================================
-- Revision Engine: Subject High Score Leaderboard (0003_admin_students_leaderboard.sql)
-- Creates new tables only. Does NOT modify or alter any existing tables.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- High Score Leaderboard per Subject
CREATE TABLE IF NOT EXISTS app.subject_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES app.subjects(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL DEFAULT 'Student',
    student_email TEXT NOT NULL DEFAULT '',
    score_percentage NUMERIC NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    session_id TEXT,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subject_id, student_id)
);

CREATE INDEX IF NOT EXISTS subject_leaderboards_subject_idx 
    ON app.subject_leaderboards (subject_id, score_percentage DESC, achieved_at ASC);

CREATE INDEX IF NOT EXISTS subject_leaderboards_student_idx 
    ON app.subject_leaderboards (student_id);
