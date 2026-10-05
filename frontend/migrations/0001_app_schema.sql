-- Roles, teacher approvals, courses and invitations.
--
-- Applied to branch br-ancient-river-b47pspmo as Neon migration
-- 4ae87f18-a1a9-4b06-8137-949dc1a31ec2. This file reproduces that schema on a
-- fresh database; re-running it on an existing one is a no-op.
--
-- Authorization note: the app connects with the database owner role from
-- server-only code, so there are no RLS policies here. Every read and write is
-- gated by src/lib/auth/dal.ts and the Server Actions in src/app/actions/.
-- Do not add a client-side or browser-reachable path to this schema without
-- adding policies first.

CREATE SCHEMA IF NOT EXISTS app;

-- student     : may accept/decline invitations only
-- teacher_pending : signed in, awaiting admin approval, no course tools
-- teacher     : may create courses, invite students, manage rosters
-- admin       : may review teacher requests
DO $$ BEGIN
  CREATE TYPE app.user_role AS ENUM (
    'student',
    'teacher_pending',
    'teacher',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE app.teacher_request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE app.enrollment_status AS ENUM ('invited', 'accepted', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- One row per auth user. Populated lazily by resolveUserRole() the first time a
-- user signs in, and rewritten by finishSignUpAction() with their chosen role.
CREATE TABLE IF NOT EXISTS app.user_roles (
  user_id    uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       app.user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE (user_id) means one request per person; re-submitting updates the
-- existing row rather than stacking duplicates.
CREATE TABLE IF NOT EXISTS app.teacher_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE
                REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  status      app.teacher_request_status NOT NULL DEFAULT 'pending',
  note        text,
  reviewed_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_requests_status_idx
  ON app.teacher_requests (status, created_at);

CREATE TABLE IF NOT EXISTS app.courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  code        text NOT NULL UNIQUE CHECK (length(code) BETWEEN 4 AND 32),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_teacher_id_idx ON app.courses (teacher_id);

CREATE TABLE IF NOT EXISTS app.enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES app.courses(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  status       app.enrollment_status NOT NULL DEFAULT 'invited',
  invited_by   uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  invited_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  -- One invitation per student per course. Re-inviting after a decline resets
  -- the row rather than creating a second one.
  UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON app.enrollments (student_id);