import { requireRole } from "@/lib/auth/guards";
import { listTeacherRequests } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await requireRole("teacher_pending");
  const requests = await listTeacherRequests();
  const mine = requests.find((row) => row.user_id === user.id);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Teacher</p>
          <h1 style={{ marginTop: 8 }}>Teacher approval pending</h1>
          <p className="page-subtitle">
            Your account can sign in, but course creation stays locked until an admin approves it.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Your request</h2>

        <dl className="detail-list">
          <div>
            <dt>Status</dt>
            <dd>
              <span className={mine?.status === "approved" ? "badge badge-green" : "badge badge-yellow"}>
                {mine?.status ?? "pending"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{mine ? formatDate(mine.created_at) : "unknown"}</dd>
          </div>
          <div>
            <dt>Your note</dt>
            <dd>{mine?.note ?? "No note provided."}</dd>
          </div>
        </dl>

        <p className="notice notice-blue">
          Nothing else to do here. As soon as an admin approves, reload this page and the teacher
          tools appear in the navigation.
        </p>
      </div>
    </>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
