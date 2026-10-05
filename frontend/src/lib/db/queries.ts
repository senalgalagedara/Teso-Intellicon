import "server-only";

import { sql, query } from "@/lib/db/client";
import type {
  EnrollmentStatus,
  TeacherRequestStatus,
  UserRole,
} from "@/lib/auth/roles";

export type UserRoleRow = {
  user_id: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
};

export type TeacherRequestRow = {
  id: string;
  user_id: string;
  status: TeacherRequestStatus;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  requester_name: string | null;
  requester_email: string | null;
};

export type CourseRow = {
  id: string;
  teacher_id: string;
  title: string;
  code: string;
  description: string | null;
  created_at: Date;
};

export type CourseWithRoster = CourseRow & {
  student_count: number;
  pending_count: number;
};

export type RosterEntry = {
  enrollment_id: string;
  student_id: string;
  student_name: string | null;
  student_email: string;
  status: EnrollmentStatus;
  invited_at: Date;
  responded_at: Date | null;
};

export type StudentEnrollmentView = {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  course_code: string;
  course_description: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
  status: EnrollmentStatus;
  invited_at: Date;
  responded_at: Date | null;
};

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Reads the app role for a user, creating the row on first authenticated
 * request.
 *
 * `ADMIN_EMAILS` is authoritative for admin: adding an email there promotes
 * that user on their next request. Removing an email does *not* demote, because
 * that would silently revoke admin on a deploy. Nothing from the client is
 * trusted here, and an existing role is otherwise preserved so an approval
 * cannot be undone by reloading a page.
 */
export async function resolveUserRole(userId: string, email: string): Promise<UserRole> {
  const initialRole: UserRole = adminEmails().has(email.toLowerCase()) ? "admin" : "student";

  const rows = await query<UserRoleRow>`
    INSERT INTO app.user_roles (user_id, email, role)
    VALUES (${userId}, ${email}, ${initialRole}::app.user_role)
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email,
          role = CASE
            WHEN EXCLUDED.role = 'admin'::app.user_role THEN 'admin'::app.user_role
            ELSE app.user_roles.role
          END,
          updated_at = now()
    RETURNING role
  `;

  return rows[0].role;
}

/** Marks a freshly registered user as awaiting admin approval. */
export async function requestTeacherAccess(
  userId: string,
  email: string,
  note: string | null,
): Promise<void> {
  await sql.transaction((tx) => [
    tx`
      INSERT INTO app.user_roles (user_id, email, role)
      VALUES (${userId}, ${email}, 'teacher_pending'::app.user_role)
      ON CONFLICT (user_id) DO UPDATE
        SET role = 'teacher_pending'::app.user_role,
            email = EXCLUDED.email,
            updated_at = now()
    `,
    tx`
      INSERT INTO app.teacher_requests (user_id, status, note)
      VALUES (${userId}, 'pending'::app.teacher_request_status, ${note})
      ON CONFLICT (user_id) DO NOTHING
    `,
  ]);
}

export async function listTeacherRequests(): Promise<TeacherRequestRow[]> {
  return query<TeacherRequestRow>`
    SELECT
      r.id,
      r.user_id,
      r.status,
      r.note,
      r.reviewed_by,
      r.reviewed_at,
      r.created_at,
      u.name AS requester_name,
      u.email AS requester_email
    FROM app.teacher_requests r
    JOIN neon_auth."user" u ON u.id = r.user_id
    ORDER BY (r.status = 'pending') DESC, r.created_at DESC
  `;
}

/**
 * Approves or rejects a pending teacher request and moves the user's role to
 * match, in one transaction.
 *
 * Returns false when the request was no longer pending, so two admins racing
 * on the same row cannot both claim to have decided it.
 */
export async function reviewTeacherRequest(
  requestId: string,
  reviewerId: string,
  decision: Extract<TeacherRequestStatus, "approved" | "rejected">,
): Promise<boolean> {
  const nextRole: UserRole = decision === "approved" ? "teacher" : "student";

  const rows = await query<{ decided: boolean }>`
    WITH decided AS (
      UPDATE app.teacher_requests
      SET status = ${decision}::app.teacher_request_status,
          reviewed_by = ${reviewerId},
          reviewed_at = now()
      WHERE id = ${requestId}
        AND status = 'pending'::app.teacher_request_status
      RETURNING user_id
    ),
    promoted AS (
      UPDATE app.user_roles
      SET role = ${nextRole}::app.user_role,
          updated_at = now()
      WHERE user_id IN (SELECT user_id FROM decided)
    )
    SELECT EXISTS (SELECT 1 FROM decided) AS decided
  `;

  return rows[0].decided;
}

export async function listCoursesForTeacher(teacherId: string): Promise<CourseWithRoster[]> {
  return query<CourseWithRoster>`
    SELECT
      c.id,
      c.teacher_id,
      c.title,
      c.code,
      c.description,
      c.created_at,
      count(e.id) FILTER (WHERE e.status = 'accepted')::int AS student_count,
      count(e.id) FILTER (WHERE e.status = 'invited')::int  AS pending_count
    FROM app.courses c
    LEFT JOIN app.enrollments e ON e.course_id = c.id
    WHERE c.teacher_id = ${teacherId}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
}

export async function findCourseById(courseId: string): Promise<CourseRow | null> {
  const rows = await query<CourseRow>`
    SELECT id, teacher_id, title, code, description, created_at
    FROM app.courses
    WHERE id = ${courseId}
  `;

  return rows[0] ?? null;
}

export async function listRoster(courseId: string): Promise<RosterEntry[]> {
  return query<RosterEntry>`
    SELECT
      e.id AS enrollment_id,
      e.student_id,
      u.name AS student_name,
      u.email AS student_email,
      e.status,
      e.invited_at,
      e.responded_at
    FROM app.enrollments e
    JOIN neon_auth."user" u ON u.id = e.student_id
    WHERE e.course_id = ${courseId}
    ORDER BY e.invited_at DESC
  `;
}

export async function listEnrollmentsForStudent(studentId: string): Promise<StudentEnrollmentView[]> {
  return query<StudentEnrollmentView>`
    SELECT
      e.id AS enrollment_id,
      e.course_id,
      c.title AS course_title,
      c.code AS course_code,
      c.description AS course_description,
      t.name AS teacher_name,
      t.email AS teacher_email,
      e.status,
      e.invited_at,
      e.responded_at
    FROM app.enrollments e
    JOIN app.courses c ON c.id = e.course_id
    JOIN neon_auth."user" t ON t.id = c.teacher_id
    WHERE e.student_id = ${studentId}
    ORDER BY e.invited_at DESC
  `;
}

/** Resolves a student's auth user id from an email, or null if unregistered. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const rows = await query<{ id: string }>`
    SELECT id FROM neon_auth."user" WHERE lower(email) = lower(${email})
  `;

  return rows[0]?.id ?? null;
}

/** True when the user already has a role row, i.e. has been seen while signed in. */
export async function hasRoleRow(userId: string): Promise<boolean> {
  const rows = await query<{ exists: boolean }>`
    SELECT EXISTS (SELECT 1 FROM app.user_roles WHERE user_id = ${userId}) AS exists
  `;

  return rows[0].exists;
}
