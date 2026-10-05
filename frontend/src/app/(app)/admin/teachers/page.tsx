import { reviewTeacherAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { requireRole } from "@/lib/auth/guards";
import { listTeacherRequests } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TeacherApprovalsPage() {
  await requireRole("admin");

  const requests = await listTeacherRequests();
  const pending = requests.filter((row) => row.status === "pending");
  const reviewed = requests.filter((row) => row.status !== "pending");

  return (
    <>
      <div className="page-head">
        <h1 className="gradient-text">Teacher approvals</h1>
        <p className="page-subtitle">
          A teacher account can sign in but cannot create courses until it is approved here.
        </p>
      </div>

      <section>
        <h2 className="section-title">Awaiting decision ({pending.length})</h2>

        {pending.length === 0 ? (
          <p className="notice">No teacher requests are waiting.</p>
        ) : (
          <ul className="stack">
            {pending.map((request) => (
              <li key={request.id} className="glass-card">
                <div className="row-between">
                  <div>
                    <h3 className="card-title">{request.requester_name ?? "Unnamed"}</h3>
                    <p className="muted">{request.requester_email}</p>
                  </div>
                  <span className="badge badge-yellow">pending</span>
                </div>

                <p className="muted">Requested {formatDate(request.created_at)}</p>
                <p>{request.note ?? "No note provided."}</p>

                <ActionForm action={reviewTeacherAction} className="inline-form">
                  <input type="hidden" name="requestId" value={request.id} />
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="btn btn-storage"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="btn btn-secondary"
                  >
                    Reject
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Reviewed ({reviewed.length})</h2>

        {reviewed.length === 0 ? (
          <p className="notice">Nothing reviewed yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Decision</th>
                <th>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((request) => (
                <tr key={request.id}>
                  <td>{request.requester_name ?? "Unnamed"}</td>
                  <td>{request.requester_email}</td>
                  <td>
                    <span
                      className={
                        request.status === "approved" ? "badge badge-green" : "badge badge-red"
                      }
                    >
                      {request.status}
                    </span>
                  </td>
                  <td>{request.reviewed_at ? formatDate(request.reviewed_at) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value);
}