-- ==============================================================================
-- Revision Engine: App-Side Schema Migration (0002_revision_app.sql)
-- Owned by Next.js application layer.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- 1. Subjects (e.g. Physics, Chemistry, Combined Mathematics)
CREATE TABLE IF NOT EXISTS app.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    stream TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Topics & Sub-topics (hierarchical: sub-topics have parent_id set)
CREATE TABLE IF NOT EXISTS app.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES app.subjects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES app.topics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topics_subject_idx ON app.topics(subject_id);
CREATE INDEX IF NOT EXISTS topics_parent_idx ON app.topics(parent_id);

-- 3. Associate Courses with a Subject (Alter existing app.courses)
ALTER TABLE app.courses
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES app.subjects(id) ON DELETE SET NULL;

-- 4. Questions Bank
CREATE TABLE IF NOT EXISTS app.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES app.courses(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES app.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES app.topics(id) ON DELETE SET NULL,
    author_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    stem TEXT NOT NULL,
    options JSONB NOT NULL, -- e.g. [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}]
    correct_option TEXT NOT NULL,
    explanation TEXT,
    teacher_difficulty INT NOT NULL DEFAULT 2 CHECK (teacher_difficulty BETWEEN 1 AND 3),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_course_idx ON app.questions(course_id);
CREATE INDEX IF NOT EXISTS questions_topic_idx ON app.questions(topic_id);
CREATE INDEX IF NOT EXISTS questions_active_idx ON app.questions(active);

-- 5. Question Serves (tracks when a question is sent to student for latency auditing)
CREATE TABLE IF NOT EXISTS app.question_serves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES app.questions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES app.courses(id) ON DELETE CASCADE,
    session_id TEXT,
    context TEXT NOT NULL DEFAULT 'practice' CHECK (context IN ('practice', 'review', 'assessment')),
    served_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_serves_student_idx ON app.question_serves (student_id, served_at DESC);

-- 6. Student Attempts
CREATE TABLE IF NOT EXISTS app.attempts (
    id UUID PRIMARY KEY,
    serve_id UUID UNIQUE REFERENCES app.question_serves(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES app.questions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES app.courses(id) ON DELETE CASCADE,
    session_id TEXT,
    chosen_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    latency_ms INT NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    context TEXT NOT NULL DEFAULT 'practice'
);

CREATE INDEX IF NOT EXISTS attempts_student_idx ON app.attempts (student_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS attempts_question_idx ON app.attempts (question_id);
CREATE INDEX IF NOT EXISTS attempts_course_idx ON app.attempts (course_id, answered_at);

-- 7. In-Class Assessments & Exam Scores
CREATE TABLE IF NOT EXISTS app.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES app.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    max_score NUMERIC NOT NULL DEFAULT 100,
    taken_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES app.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    UNIQUE (assessment_id, student_id)
);

CREATE INDEX IF NOT EXISTS assessment_scores_student_idx ON app.assessment_scores(student_id);

-- 8. Course Links (Teacher consent for cross-subject Z-scores)
CREATE TABLE IF NOT EXISTS app.course_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_a UUID NOT NULL REFERENCES app.courses(id) ON DELETE CASCADE,
    course_b UUID NOT NULL REFERENCES app.courses(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
    approved_by UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_a, course_b)
);

-- 9. Product & Analytics Events
CREATE TABLE IF NOT EXISTS app.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_user_type_idx ON app.events (user_id, type, created_at DESC);
