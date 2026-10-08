import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { listAdminSubjects } from "@/lib/db/admin";
import { createSubjectAction, deleteSubjectAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  await requireRole("admin");

  const subjects = await listAdminSubjects();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Management</p>
          <h1 style={{ marginTop: 8 }}>Subjects</h1>
          <p className="page-subtitle">
            Create and organize academic subjects. Questions and practice pools belong to these subjects.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/students" className="btn btn-secondary">
            Students List
          </Link>
          <Link href="/admin/leaderboard" className="btn btn-secondary">
            Leaderboard
          </Link>
          <Link href="/admin/questions" className="btn btn-secondary">
            Question Pool
          </Link>
          <Link href="/admin/questions/import" className="btn btn-primary">
            Import CSV
          </Link>
        </div>
      </div>

      {/* CREATE SUBJECT FORM */}
      <section className="card" style={{ marginBottom: "32px" }}>
        <h2 className="card-title">Create New Subject</h2>
        <p className="muted" style={{ margin: "4px 0 16px" }}>
          Define the subject name and stream (e.g., Physical Science, Bio Science, Commerce, Arts, General).
        </p>

        <ActionForm action={createSubjectAction}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <label className="field">
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Subject Name *</span>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Physics, Combined Mathematics, Chemistry"
                className="input"
              />
            </label>

            <label className="field">
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Stream / Discipline</span>
              <input
                type="text"
                name="stream"
                defaultValue="General"
                placeholder="e.g. Physical Science, Technology, Arts"
                className="input"
              />
            </label>
          </div>

          <SubmitButton pendingLabel="Creating Subject...">
            Create Subject
          </SubmitButton>
        </ActionForm>
      </section>

      {/* EXISTING SUBJECTS LIST */}
      <section>
        <div className="row-between" style={{ marginBottom: "12px" }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Available Subjects ({subjects.length})
          </h2>
        </div>

        {subjects.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "8px" }}>No subjects yet</p>
            <p className="muted" style={{ maxWidth: "400px", margin: "0 auto 20px" }}>
              Get started by creating your first subject above, or import questions via CSV.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Stream</th>
                  <th>Questions in Pool</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{sub.stream}</span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/questions?subject=${sub.id}`}
                        className="badge badge-blue"
                        style={{ textDecoration: "none" }}
                      >
                        {sub.question_count} {sub.question_count === 1 ? "question" : "questions"}
                      </Link>
                    </td>
                    <td>{formatDate(sub.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                        <Link
                          href={`/admin/questions?subject=${sub.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          View Pool
                        </Link>
                        <Link
                          href={`/admin/questions/import?subjectId=${sub.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Import CSV
                        </Link>
                        <ActionForm action={deleteSubjectAction} className="inline-form">
                          <input type="hidden" name="subjectId" value={sub.id} />
                          <button
                            type="submit"
                            className="btn btn-danger btn-sm"
                            title="Delete this subject"
                          >
                            Delete
                          </button>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function formatDate(value: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value);
  } catch {
    return "-";
  }
}
