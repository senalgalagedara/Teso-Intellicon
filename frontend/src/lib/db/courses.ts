import "server-only";

import { query, sql } from "@/lib/db/client";
import type { CourseRow } from "@/lib/db/queries";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Human-typeable join code. The alphabet drops characters that are easy to
 * misread (0/O, 1/I).
 */
function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export type CreateCourseResult =
  | { ok: true; course: CourseRow }
  | { ok: false; error: string };

export async function createCourse(
  teacherId: string,
  title: string,
  description: string | null,
): Promise<CreateCourseResult> {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0 || trimmedTitle.length > 200) {
    return { ok: false, error: "Title must be between 1 and 200 characters." };
  }

  if (description !== null && description.length > 2000) {
    return { ok: false, error: "Description must be 2000 characters or fewer." };
  }

  // Retrying on the unique-code collision is cheaper than asking a teacher to
  // retype a code they did not choose.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const rows = await query<CourseRow>`
        INSERT INTO app.courses (teacher_id, title, code, description)
        VALUES (${teacherId}, ${trimmedTitle}, ${randomCode()}, ${description})
        RETURNING id, teacher_id, title, code, description, created_at
      `;

      return { ok: true, course: rows[0] };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 4) {
        throw error;
      }
    }
  }

  return { ok: false, error: "Could not allocate a course code. Try again." };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export type InviteResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

/**
 * Creates a pending enrollment for an already-registered student.
 *
 * Re-inviting someone who declined resets them to `invited`; inviting someone
 * who already accepted is a no-op so the roster keeps its original timestamp.
 */
export async function inviteStudentToCourse(
  teacherId: string,
  courseId: string,
  studentEmail: string,
): Promise<InviteResult> {
  const email = studentEmail.trim().toLowerCase();

  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const owners = await query<{ id: string }>`
    SELECT id FROM app.courses WHERE id = ${courseId} AND teacher_id = ${teacherId}
  `;

  if (owners.length === 0) {
    return { ok: false, error: "Course not found." };
  }

  const targets = await query<{ id: string; role: string }>`
    SELECT u.id, coalesce(r.role::text, '') AS role
    FROM neon_auth."user" u
    LEFT JOIN app.user_roles r ON r.user_id = u.id
    WHERE lower(u.email) = ${email}
  `;

  const target = targets[0];

  if (!target) {
    return { ok: false, error: "No account uses that email. Ask them to sign up first." };
  }

  if (target.id === teacherId) {
    return { ok: false, error: "You cannot invite yourself." };
  }

  if (target.role === "admin") {
    return { ok: false, error: "Admins cannot be enrolled as students." };
  }

  const existing = await query<{ status: string }>`
    SELECT status::text AS status
    FROM app.enrollments
    WHERE course_id = ${courseId} AND student_id = ${target.id}
  `;

  const current = existing[0]?.status;

  if (current === "accepted") {
    return { ok: false, error: "That student is already enrolled." };
  }

  if (current === "invited") {
    return { ok: false, error: "That student already has a pending invitation." };
  }

  await sql`
    INSERT INTO app.enrollments (course_id, student_id, status, invited_by)
    VALUES (${courseId}, ${target.id}, 'invited'::app.enrollment_status, ${teacherId})
    ON CONFLICT (course_id, student_id) DO UPDATE
      SET status = 'invited'::app.enrollment_status,
          invited_at = now(),
          responded_at = NULL
  `;

  return { ok: true, created: current !== "declined" };
}

/**
 * Accepts or declines an invitation. Scoped to the student's own enrollment id,
 * so one student cannot respond to another's invite.
 */
export async function respondToInvitation(
  studentId: string,
  enrollmentId: string,
  response: "accepted" | "declined",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await query<{ id: string }>`
    UPDATE app.enrollments
    SET status = ${response}::app.enrollment_status,
        responded_at = now()
    WHERE id = ${enrollmentId}
      AND student_id = ${studentId}
      AND status = 'invited'::app.enrollment_status
    RETURNING id
  `;

  if (rows.length === 0) {
    return { ok: false, error: "That invitation is no longer pending." };
  }

  return { ok: true };
}

/** Removes a student from a course. Scoped to the owning teacher. */
export async function removeStudentFromCourse(
  teacherId: string,
  courseId: string,
  enrollmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const removed = await query<{ id: string }>`
    DELETE FROM app.enrollments e
    USING app.courses c
    WHERE e.id = ${enrollmentId}
      AND e.course_id = ${courseId}
      AND c.id = e.course_id
      AND c.teacher_id = ${teacherId}
    RETURNING e.id
  `;

  return removed.length > 0 ? { ok: true } : { ok: false, error: "Enrollment not found." };
}

export async function deleteCourse(
  teacherId: string,
  courseId: string,
): Promise<{ ok: boolean; error?: string }> {
  const rows = await query<{ id: string }>`
    DELETE FROM app.courses
    WHERE id = ${courseId} AND teacher_id = ${teacherId}
    RETURNING id
  `;

  return rows.length > 0 ? { ok: true } : { ok: false, error: "Course not found." };
}

/** Exposed for the admin roster page. */
export async function countUsers(): Promise<number> {
  const rows = await query<{ count: number }>`
    SELECT count(*)::int AS count FROM neon_auth."user"
  `;

  return rows[0].count;
}
