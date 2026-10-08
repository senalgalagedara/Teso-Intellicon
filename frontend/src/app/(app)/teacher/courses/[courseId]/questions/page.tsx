import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { findCourseById } from "@/lib/db/queries";
import { listQuestionsForTeacher } from "@/lib/db/questions";
import { createQuestionAction, deleteQuestionAction } from "@/app/actions/questions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function CourseQuestionsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireRole("teacher");
  const { courseId } = await params;
  const course = await findCourseById(courseId);

  if (!course || course.teacher_id !== user.id) {
    notFound();
  }

  const questions = await listQuestionsForTeacher(courseId, user.id);

  return (
    <>
      <div className="page-head" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
              <Link href={`/teacher/courses/${courseId}`} style={{ color: "var(--accent-purple)", textDecoration: "none", fontSize: "0.9rem" }}>
                ← Back to Roster
              </Link>
            </div>
            <h1 className="gradient-text">{course.title} Question Bank</h1>
            <p className="page-subtitle">
              Author and curate MCQ items. Algorithmic difficulty starts at your rating and refines via Rasch IRT.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/teacher/courses/${courseId}/analytics`} className="btn btn-secondary">
              View Item Analytics →
            </Link>
          </div>
        </div>
      </div>

      {/* Add New Question Form */}
      <div className="glass-card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <h2 className="card-title" style={{ marginBottom: "1rem" }}>New Question</h2>
        <ActionForm action={createQuestionAction} className="stack-sm">
          <input type="hidden" name="course_id" value={courseId} />

          <label className="field">
            <span>Question Stem</span>
            <textarea
              className="textarea"
              name="stem"
              required
              rows={3}
              placeholder="e.g. A particle of mass m executes simple harmonic motion..."
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label className="field">
              <span>Option A</span>
              <input className="input" name="option_a" required placeholder="Option A text" />
            </label>

            <label className="field">
              <span>Option B</span>
              <input className="input" name="option_b" required placeholder="Option B text" />
            </label>

            <label className="field">
              <span>Option C (Optional)</span>
              <input className="input" name="option_c" placeholder="Option C text" />
            </label>

            <label className="field">
              <span>Option D (Optional)</span>
              <input className="input" name="option_d" placeholder="Option D text" />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
            <label className="field">
              <span>Correct Option</span>
              <select className="input" name="correct_option" defaultValue="A" required>
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </label>

            <label className="field">
              <span>Teacher Difficulty (Initial Prior)</span>
              <select className="input" name="teacher_difficulty" defaultValue="2" required>
                <option value="1">1 - Foundation / Easy (b ≈ -1.0)</option>
                <option value="2">2 - Standard A/L Level (b ≈ 0.0)</option>
                <option value="3">3 - Challenging / Stretch (b ≈ +1.0)</option>
              </select>
            </label>
          </div>

          <label className="field" style={{ marginTop: "0.5rem" }}>
            <span>Explanation (Teacher Written Solution)</span>
            <textarea
              className="textarea"
              name="explanation"
              rows={2}
              placeholder="Detailed step-by-step reasoning shown to the student upon answer submission..."
            />
          </label>

          <div style={{ marginTop: "1rem" }}>
            <SubmitButton pendingLabel="Saving question...">Add Question to Bank</SubmitButton>
          </div>
        </ActionForm>
      </div>

      {/* Existing Questions List */}
      <section>
        <h2 className="section-title">Question Bank ({questions.length} Items)</h2>

        {questions.length === 0 ? (
          <p className="notice">No questions created yet for this course. Add your first item above.</p>
        ) : (
          <div className="stack">
            {questions.map((q, idx) => (
              <div key={q.id} className="glass-card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--accent-purple)" }}>#{questions.length - idx}</span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Prior Difficulty: {q.teacher_difficulty}/3
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        Added {new Date(q.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "0.75rem" }}>{q.stem}</p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.9rem",
                            background: opt.id === q.correct_option ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
                            border: `1px solid ${opt.id === q.correct_option ? "rgba(16, 185, 129, 0.3)" : "transparent"}`,
                            color: opt.id === q.correct_option ? "var(--accent-emerald)" : "var(--text-muted)",
                          }}
                        >
                          <strong>{opt.id}.</strong> {opt.text}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
                        <strong>Solution:</strong> {q.explanation}
                      </p>
                    )}
                  </div>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      const qId = formData.get("questionId") as string;
                      await deleteQuestionAction(qId, courseId);
                    }}
                  >
                    <input type="hidden" name="questionId" value={q.id} />
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{ color: "var(--accent-rose)", borderColor: "rgba(244, 63, 94, 0.3)", fontSize: "0.8rem" }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
