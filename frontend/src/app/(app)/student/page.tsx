import { respondToInviteAction } from "@/app/actions/student";
import { ActionForm } from "@/components/action-form";
import { requireRole } from "@/lib/auth/guards";
import { listEnrollmentsForStudent } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const user = await requireRole("student");
  const enrollments = await listEnrollmentsForStudent(user.id);

  const invited = enrollments.filter((row) => row.status === "invited");
  const active = enrollments.filter((row) => row.status === "accepted");
  const declined = enrollments.filter((row) => row.status === "declined");

  return (
    <>
      <div className="page-head">
        <h1 className="gradient-text">My courses</h1>
        <p className="page-subtitle">
          Invitations from teachers land here. Accepting one enrols you in that course.
        </p>
      </div>

      <section>
        <h2 className="section-title">Invitations ({invited.length})</h2>

        {invited.length === 0 ? (
          <p className="notice">No invitations waiting.</p>
        ) : (
          <ul className="stack">
            {invited.map((row) => (
              <li key={row.enrollment_id} className="glass-card">
                <div className="row-between">
                  <div>
                    <h3 className="card-title">{row.course_title}</h3>
                    <p className="muted">
                      {row.teacher_name ?? "A teacher"} &middot; invited {formatDate(row.invited_at)}
                    </p>
                  </div>
                  <code className="join-code">{row.course_code}</code>
                </div>

                <p>{row.course_description ?? "No description provided."}</p>

                <div className="inline-form">
                  <ActionForm action={respondToInviteAction} className="inline-form">
                    <input type="hidden" name="enrollmentId" value={row.enrollment_id} />
                    <button type="submit" name="response" value="accepted" className="btn btn-primary">
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="response"
                      value="declined"
                      className="btn btn-secondary"
                    >
                      Decline
                    </button>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Enrolled ({active.length})</h2>

        {active.length === 0 ? (
          <p className="notice">You are not enrolled in any course yet.</p>
        ) : (
          <ul className="stack">
            {active.map((row) => (
              <li key={row.enrollment_id} className="glass-card">
                <div className="row-between">
                  <h3 className="card-title">{row.course_title}</h3>
                  <span className="badge badge-green">enrolled</span>
                </div>
                <p className="muted">
                  {row.teacher_name ?? "A teacher"} &middot; {row.teacher_email}
                </p>
                {row.course_description ? <p>{row.course_description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {declined.length > 0 ? (
        <section>
          <h2 className="section-title">Declined ({declined.length})</h2>
          <ul className="stack">
            {declined.map((row) => (
              <li key={row.enrollment_id} className="glass-card row-between">
                <span>{row.course_title}</span>
                <span className="badge badge-red">declined</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
