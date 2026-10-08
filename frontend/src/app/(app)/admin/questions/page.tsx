import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { listAdminSubjects, listAdminQuestions } from "@/lib/db/admin";
import { createAdminQuestionAction, deleteAdminQuestionAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; action?: string }>;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const currentSubjectId = params.subject || "";

  const subjects = await listAdminSubjects();
  const questions = await listAdminQuestions(currentSubjectId || undefined);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Management</p>
          <h1 style={{ marginTop: 8 }}>Question & Answers Pool</h1>
          <p className="page-subtitle">
            Manage repository questions and answer choices. Questions can be added manually or imported via CSV.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/subjects" className="btn btn-secondary">
            Manage Subjects
          </Link>
          <Link href="/admin/questions/import" className="btn btn-primary">
            Import from CSV
          </Link>
        </div>
      </div>

      {/* QUICK CSV PROMO BANNER */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
          borderColor: "#c7d2fe",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#3730a3", marginBottom: "4px" }}>
            Bulk Upload with CSV
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#4338ca", margin: 0 }}>
            Upload large question sets with 4 answers and correct keys, review & verify before approving into the pool.
          </p>
        </div>
        <Link href="/admin/questions/import" className="btn btn-primary">
          Launch CSV Importer &rarr;
        </Link>
      </div>

      {/* CREATE QUESTION FORM */}
      <section className="card" style={{ marginBottom: "32px" }}>
        <div className="row-between" style={{ marginBottom: "16px" }}>
          <div>
            <h2 className="card-title">Add Question to Pool</h2>
            <p className="muted" style={{ margin: "2px 0 0" }}>
              Schema: Question text, 4 answer choices (A, B, C, D), and correct answer key.
            </p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="notice notice-yellow">
            <p>
              Please <Link href="/admin/subjects" style={{ textDecoration: "underline", fontWeight: 600 }}>create at least one subject</Link> first before adding questions.
            </p>
          </div>
        ) : (
          <ActionForm action={createAdminQuestionAction}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "16px" }}>
              <label className="field">
                <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Subject *</span>
                <select
                  name="subject_id"
                  required
                  defaultValue={currentSubjectId}
                  className="select"
                >
                  <option value="" disabled>-- Select Subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.stream})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Question Text *</span>
                <textarea
                  name="stem"
                  required
                  rows={3}
                  placeholder="Enter the question stem / prompt..."
                  className="textarea"
                />
              </label>
            </div>

            {/* 4 ANSWERS SCHEMA */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                Answer Options (4 Required) & Correct Answer *
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                {/* Option A */}
                <div className="card" style={{ padding: "12px", background: "var(--surface-muted)" }}>
                  <div className="row-between" style={{ marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>Option A</span>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", cursor: "pointer" }}>
                      <input type="radio" name="correct_option" value="A" required defaultChecked />
                      <strong>Mark Correct</strong>
                    </label>
                  </div>
                  <input
                    type="text"
                    name="option_a"
                    required
                    placeholder="Text for option A"
                    className="input"
                  />
                </div>

                {/* Option B */}
                <div className="card" style={{ padding: "12px", background: "var(--surface-muted)" }}>
                  <div className="row-between" style={{ marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>Option B</span>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", cursor: "pointer" }}>
                      <input type="radio" name="correct_option" value="B" required />
                      <strong>Mark Correct</strong>
                    </label>
                  </div>
                  <input
                    type="text"
                    name="option_b"
                    required
                    placeholder="Text for option B"
                    className="input"
                  />
                </div>

                {/* Option C */}
                <div className="card" style={{ padding: "12px", background: "var(--surface-muted)" }}>
                  <div className="row-between" style={{ marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>Option C</span>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", cursor: "pointer" }}>
                      <input type="radio" name="correct_option" value="C" required />
                      <strong>Mark Correct</strong>
                    </label>
                  </div>
                  <input
                    type="text"
                    name="option_c"
                    required
                    placeholder="Text for option C"
                    className="input"
                  />
                </div>

                {/* Option D */}
                <div className="card" style={{ padding: "12px", background: "var(--surface-muted)" }}>
                  <div className="row-between" style={{ marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>Option D</span>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", cursor: "pointer" }}>
                      <input type="radio" name="correct_option" value="D" required />
                      <strong>Mark Correct</strong>
                    </label>
                  </div>
                  <input
                    type="text"
                    name="option_d"
                    required
                    placeholder="Text for option D"
                    className="input"
                  />
                </div>
              </div>
            </div>

            <label className="field" style={{ marginBottom: "18px" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Explanation (Optional)</span>
              <textarea
                name="explanation"
                rows={2}
                placeholder="Brief explanation of why the correct answer is right..."
                className="textarea"
              />
            </label>

            <SubmitButton pendingLabel="Saving Question...">
              Add Question to Pool
            </SubmitButton>
          </ActionForm>
        )}
      </section>

      {/* FILTER & QUESTIONS LIST */}
      <section>
        <div className="row-between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              Question Pool ({questions.length})
            </h2>
          </div>

          {/* Subject Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Filter Subject:</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <Link
                href="/admin/questions"
                className={`btn btn-sm ${!currentSubjectId ? "btn-primary" : "btn-secondary"}`}
              >
                All
              </Link>
              {subjects.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/admin/questions?subject=${sub.id}`}
                  className={`btn btn-sm ${currentSubjectId === sub.id ? "btn-primary" : "btn-secondary"}`}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "8px" }}>
              No questions found
            </p>
            <p className="muted" style={{ maxWidth: "420px", margin: "0 auto 20px" }}>
              {currentSubjectId
                ? "No questions have been added under this subject yet. Add one above or import via CSV."
                : "The question pool is currently empty. Add your first question above or import a CSV file."}
            </p>
            <Link href="/admin/questions/import" className="btn btn-primary">
              Import Questions with CSV
            </Link>
          </div>
        ) : (
          <div className="stack" style={{ gap: "16px" }}>
            {questions.map((q, index) => (
              <div key={q.id} className="card">
                <div className="row-between" style={{ alignItems: "flex-start", marginBottom: "12px", gap: "12px" }}>
                  <div>
                    <span className="badge badge-blue" style={{ marginBottom: "6px" }}>
                      {q.subject_name}
                    </span>
                    <h3 style={{ fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.4 }}>
                      #{index + 1}. {q.stem}
                    </h3>
                  </div>

                  <ActionForm action={deleteAdminQuestionAction} className="inline-form">
                    <input type="hidden" name="questionId" value={q.id} />
                    <button
                      type="submit"
                      className="btn btn-danger btn-sm"
                      title="Delete question from pool"
                    >
                      Delete
                    </button>
                  </ActionForm>
                </div>

                {/* 4 Answers Display */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginTop: "12px" }}>
                  {q.options.map((opt) => {
                    const isCorrect = opt.id === q.correct_option;
                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "var(--radius)",
                          border: isCorrect ? "2px solid var(--success)" : "1px solid var(--border)",
                          background: isCorrect ? "var(--success-soft)" : "var(--surface)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: isCorrect ? "var(--success-text)" : "var(--text-secondary)",
                            minWidth: "18px",
                          }}
                        >
                          {opt.id}.
                        </span>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: isCorrect ? "var(--success-text)" : "var(--text)",
                            fontWeight: isCorrect ? 600 : 400,
                          }}
                        >
                          {opt.text}
                        </span>
                        {isCorrect && (
                          <span
                            className="badge badge-green"
                            style={{ marginLeft: "auto", fontSize: "0.625rem", padding: "1px 6px" }}
                          >
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <p className="muted" style={{ marginTop: "12px", fontSize: "0.8125rem", borderTop: "1px dashed var(--border)", paddingTop: "8px" }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
