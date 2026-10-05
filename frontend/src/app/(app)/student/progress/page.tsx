import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { engineClient, StudentProgressResponse, PeerDiagnosticResponse } from "@/lib/engine/client";
import { MasteryBar } from "@/components/mastery-bar";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  const user = await requireRole("student");

  let progress: StudentProgressResponse | null = null;
  let diagnostics: PeerDiagnosticResponse | null = null;
  let errorMsg: string | null = null;

  try {
    progress = await engineClient.getStudentProgress(user.id);
    diagnostics = await engineClient.getPeerDiagnostic(user.id);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Failed to load progress data.";
  }

  return (
    <>
      <div className="page-head" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="gradient-text">Mastery & Peer Diagnostics</h1>
            <p className="page-subtitle">
              Algorithmically tracked through Bayesian Knowledge Tracing & Rasch Item Response Theory.
            </p>
          </div>
          <Link href="/student/practice" className="btn btn-primary">
            Continue Practice
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <p className="form-error">{errorMsg}</p>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Rasch Ability (θ)
              </span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-purple)" }}>
                {progress ? (progress.theta >= 0 ? `+${progress.theta}` : progress.theta) : "0.0"}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Latent knowledge scale [-4 to +4]
              </p>
            </div>

            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Review Load (Due)
              </span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-amber)" }}>
                {progress ? progress.review_load : 0}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                FSRS flashcards awaiting review
              </p>
            </div>

            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Weak Topics Identified
              </span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-rose)" }}>
                {progress ? progress.weak_topics.length : 0}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Prioritized by adaptive selector
              </p>
            </div>
          </div>

          {/* Topic Mastery Section */}
          <div className="glass-card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
            <h2 className="card-title" style={{ marginBottom: "1.25rem" }}>
              Sub-Topic Mastery (Bayesian Knowledge Tracing)
            </h2>
            {progress && progress.topic_mastery.length > 0 ? (
              <div>
                {progress.topic_mastery.map((tm) => (
                  <MasteryBar
                    key={tm.topic_id}
                    topicName={tm.topic_name}
                    pMastery={tm.p_mastery}
                    status={tm.status}
                  />
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>
                No topic data yet. Practice questions to build your mastery model.
              </p>
            )}
          </div>

          {/* Peer Diagnostics: Missed Peer-Easy vs Cohort-Hard */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {/* Missed Peer-Easy Traps */}
            <div className="glass-card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                  Peer-Easy Traps Missed ({diagnostics?.missed_peer_easy.length || 0})
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Questions &gt;85% of your peers solved correctly. These indicate careless slips or specific traps.
              </p>

              {diagnostics && diagnostics.missed_peer_easy.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {diagnostics.missed_peer_easy.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(244, 63, 94, 0.08)",
                        border: "1px solid rgba(244, 63, 94, 0.2)",
                      }}
                    >
                      <p style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{item.stem}</p>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>Your choice: <strong style={{ color: "var(--accent-rose)" }}>{item.chosen_option}</strong></span>
                        <span>Correct: <strong style={{ color: "var(--accent-emerald)" }}>{item.correct_option}</strong></span>
                        <span>Peer Facility: {Math.round(item.peer_facility * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>No peer-easy slips detected!</p>
              )}
            </div>

            {/* Cohort-Hard Questions */}
            <div className="glass-card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🏔️</span>
                <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                  Cohort-Hard Questions ({diagnostics?.cohort_hard.length || 0})
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Challenging items where &lt;20% of the cohort got it right. Deep conceptual gaps to revisit.
              </p>

              {diagnostics && diagnostics.cohort_hard.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {diagnostics.cohort_hard.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(99, 102, 241, 0.08)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                      }}
                    >
                      <p style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{item.stem}</p>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>Your choice: <strong style={{ color: "var(--accent-rose)" }}>{item.chosen_option}</strong></span>
                        <span>Correct: <strong style={{ color: "var(--accent-emerald)" }}>{item.correct_option}</strong></span>
                        <span>Peer Facility: {Math.round(item.peer_facility * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>No cohort-hard misses recorded.</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
