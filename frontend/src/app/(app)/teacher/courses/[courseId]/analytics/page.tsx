import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { findCourseById } from "@/lib/db/queries";
import { engineClient, ItemStatItem } from "@/lib/engine/client";

export const dynamic = "force-dynamic";

export default async function CourseItemAnalyticsPage({
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

  let items: ItemStatItem[] = [];
  let errorMsg: string | null = null;

  try {
    const statsResponse = await engineClient.getItemStats(courseId);
    items = statsResponse.items;
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Failed to load item statistics.";
  }

  const flaggedCount = items.filter((i) => i.flags && i.flags.length > 0).length;

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
            <h1 className="gradient-text">{course.title} Item Analytics</h1>
            <p className="page-subtitle">
              Cohort facility, discrimination index, and automated diagnostic flags for item quality control.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href={`/teacher/courses/${courseId}/questions`} className="btn btn-secondary">
              Question Bank
            </Link>
            <Link href="/teacher/zscores" className="btn btn-secondary">
              Composite Z-Scores
            </Link>
          </div>
        </div>
      </div>

      {errorMsg ? (
        <p className="form-error">{errorMsg}</p>
      ) : (
        <>
          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Total Items Analyzed
              </span>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-blue)" }}>
                {items.length}
              </h2>
            </div>
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Items with Diagnostic Flags
              </span>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem", color: flaggedCount > 0 ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                {flaggedCount}
              </h2>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="notice">No questions or attempts recorded for this course yet.</p>
          ) : (
            <div className="stack">
              {items.map((item) => {
                const facPct = Math.round(item.facility * 100);
                const hasFlags = item.flags && item.flags.length > 0;

                return (
                  <div
                    key={item.question_id}
                    className="glass-card"
                    style={{
                      padding: "1.5rem",
                      borderLeft: hasFlags ? "4px solid var(--accent-amber)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
                      <p style={{ fontWeight: 500, fontSize: "1.05rem", flex: 1 }}>{item.stem}</p>
                      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {item.attempts_count} {item.attempts_count === 1 ? "attempt" : "attempts"}
                        </span>
                      </div>
                    </div>

                    {/* Stats Badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                      <div
                        style={{
                          padding: "0.3rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(255, 255, 255, 0.05)",
                          fontSize: "0.85rem",
                        }}
                      >
                        Facility: <strong>{facPct}%</strong>
                      </div>

                      <div
                        style={{
                          padding: "0.3rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(255, 255, 255, 0.05)",
                          fontSize: "0.85rem",
                        }}
                      >
                        Discrimination (r_pb):{" "}
                        <strong style={{ color: item.discrimination < 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                          {item.discrimination}
                        </strong>
                      </div>

                      {/* Flags */}
                      {item.flags.map((flag) => {
                        let label = flag;
                        let bg = "rgba(245, 158, 11, 0.15)";
                        let color = "var(--accent-amber)";

                        if (flag === "suspect_key") {
                          label = "⚠️ Suspect Key (r_pb < 0)";
                          bg = "rgba(244, 63, 94, 0.15)";
                          color = "var(--accent-rose)";
                        } else if (flag === "hot_distractor") {
                          label = "🔥 Hot Distractor";
                          bg = "rgba(249, 115, 22, 0.15)";
                          color = "#f97316";
                        } else if (flag === "too_easy") {
                          label = "Too Easy (>90%)";
                        } else if (flag === "too_hard") {
                          label = "Too Hard (<20%)";
                        }

                        return (
                          <span
                            key={flag}
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "0.2rem 0.6rem",
                              borderRadius: "9999px",
                              background: bg,
                              color: color,
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
