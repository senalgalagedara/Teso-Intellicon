import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCourseAction, inviteStudentAction, removeStudentAction } from "@/app/actions/teacher";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth/guards";
import { findCourseById, listRoster } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CourseRosterPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireRole("teacher");
  const { courseId } = await params;

  const course = await findCourseById(courseId);

  // Ownership check, not just a role check: a teacher asking for someone else's
  // course id gets the same 404 as a missing course.
  if (!course || course.teacher_id !== user.id) {
    notFound();
  }

  const roster = await listRoster(course.id);

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/teacher" className="back-link">
            &larr; All courses
          </Link>
          <h1 className="gradient-text">{course.title}</h1>
          <p className="page-subtitle">{course.description ?? "No description."}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/teacher/courses/${course.id}/questions`} className="btn btn-secondary">
            Question Bank
          </Link>
          <Link href={`/teacher/courses/${course.id}/analytics`} className="btn btn-secondary">
            Item Analytics
          </Link>
          <code className="join-code">{course.code}</code>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="card-title">Invite a student</h2>
        <p className="muted">
          The student must already have an account. They accept or decline from their own
          dashboard.
        </p>

        <ActionForm action={inviteStudentAction} className="inline-form">
          <input type="hidden" name="courseId" value={course.id} />
          <input
            className="input"
            type="email"
            name="email"
            required
            placeholder="student@example.com"
            aria-label="Student email"
          />
          <SubmitButton pendingLabel="Sending...">Send invitation</SubmitButton>
        </ActionForm>
      </div>

      <section>
        <h2 className="section-title">Roster ({roster.length})</h2>

        {roster.length === 0 ? (
          <p className="notice">Nobody invited yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Invited</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roster.map((entry) => (
                <tr key={entry.enrollment_id}>
                  <td>
                    <span className="stack-sm">
                      <span>{entry.student_name ?? "Unnamed"}</span>
                      <span className="muted">{entry.student_email}</span>
                    </span>
                  </td>
                  <td>
                    <span className={statusBadge(entry.status)}>{entry.status}</span>
                  </td>
                  <td>{formatDate(entry.invited_at)}</td>
                  <td className="cell-end">
                    <ActionForm action={removeStudentAction} className="inline-form">
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="enrollmentId" value={entry.enrollment_id} />
                      <button type="submit" className="btn btn-secondary">
                        Remove
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="glass-card danger-zone">
        <h2 className="card-title">Delete course</h2>
        <p className="muted">Removes the course and every enrollment on it.</p>
        <ActionForm action={deleteCourseAction} className="inline-form">
          <input type="hidden" name="courseId" value={course.id} />
          <button type="submit" className="btn btn-danger">
            Delete this course
          </button>
        </ActionForm>
      </div>
    </>
  );
}

function statusBadge(status: string): string {
  switch (status) {
    case "accepted":
      return "badge badge-green";
    case "declined":
      return "badge badge-red";
    default:
      return "badge badge-yellow";
  }
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
