import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { engineClient, DueReviewItem } from "@/lib/engine/client";
import { query } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function StudentReviewPage() {
  const user = await requireRole("student");

  let dueReviews: DueReviewItem[] = [];
  let errorMsg: string | null = null;

  try {
    dueReviews = await engineClient.getDueReviews(user.id, 50);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Failed to load due reviews.";
  }

  // Fetch question details for due cards
  let questionStems: Record<string, string> = {};
  if (dueReviews.length > 0) {
    const qids = dueReviews.map((r) => r.question_id);
    const rows = await query<{ id: string; stem: string }>`
      SELECT id, stem FROM app.questions WHERE id = ANY(${qids})
    `;
    questionStems = Object.fromEntries(rows.map((r) => [r.id, r.stem]));
  }

  return (
    <>
      <div className="page-head" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="gradient-text">Spaced Repetition Review</h1>
            <p className="page-subtitle">
              Memory-aware revision powered by FSRS &middot; Micro-reviews scheduled just before retention fades.
            </p>
          </div>
          <Link href="/student/practice" className="btn btn-primary">
            Start Adaptive Practice
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <p className="form-error">{errorMsg}</p>
      ) : dueReviews.length === 0 ? (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎉</div>
          <h2 className="card-title" style={{ marginBottom: "0.5rem" }}>All caught up!</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto 1.5rem auto" }}>
            No cards are due for spaced repetition right now. FSRS will notify you when items near their forgetting threshold.
          </p>
          <Link href="/student/practice" className="btn btn-primary">
            Practice New Questions
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="section-title">Due For Review Today ({dueReviews.length})</h2>
          <div className="stack">
            {dueReviews.map((item) => {
              const retrievabilityPct = Math.round(item.retrievability * 100);
              const stem = questionStems[item.question_id] || "Practice Item";
              return (
                <div key={item.question_id} className="glass-card" style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: "1.05rem", marginBottom: "0.5rem" }}>
                        {stem}
                      </p>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        <span>
                          Estimated Retrievability:{" "}
                          <strong style={{ color: retrievabilityPct < 70 ? "var(--accent-rose)" : "var(--accent-amber)" }}>
                            {retrievabilityPct}%
                          </strong>
                        </span>
                        <span>&middot;</span>
                        <span>Due: {new Date(item.due_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Link
                      href={`/student/practice`}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
                    >
                      Review Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
