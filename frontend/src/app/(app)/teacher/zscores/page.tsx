import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { listCoursesForTeacher } from "@/lib/db/queries";
import { engineClient, StudentZScoreItem } from "@/lib/engine/client";

export const dynamic = "force-dynamic";

export default async function TeacherZScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireRole("teacher");
  const { courseId } = await searchParams;
  const courses = await listCoursesForTeacher(user.id);

  if (courses.length === 0) {
    return (
      <div className="page-head">
        <h1 className="gradient-text">Z-Score Projections</h1>
        <p className="notice" style={{ marginTop: "1rem" }}>
          You have not created any courses yet. Create courses to view cohort analytics.
        </p>
      </div>
    );
  }

  const selectedCourseId = courseId || courses[0].id;
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  let students: StudentZScoreItem[] = [];
  let errorMsg: string | null = null;

  try {
    const zResponse = await engineClient.getCourseZScores(selectedCourseId);
    students = zResponse.students;
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Failed to load Z-score projections.";
  }

  return (
    <>
      <div className="page-head" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="gradient-text">Cross-Subject Z-Score Projections</h1>
            <p className="page-subtitle">
              Cohort-relative composite projections with 1,000-sample Monte Carlo uncertainty bands (P10–P90).
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/teacher" className="btn btn-secondary">
              Back to Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Course Selector Tabs */}
      {courses.length > 1 && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", overflowX: "auto" }}>
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/zscores?courseId=${c.id}`}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
                background: c.id === selectedCourseId ? "var(--gradient-brand)" : "var(--bg-card)",
                color: "var(--text-main)",
                border: "1px solid var(--bg-card-border)",
              }}
            >
              {c.title}
            </Link>
          ))}
        </div>
      )}

      {/* Cross-Subject Privacy Notice */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-md)",
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        🔒 <strong>Consent Enforced:</strong> Cross-subject composite projections require teacher consent recorded in{" "}
        <code>app.course_links</code>. Results are cohort-relative projections for Sri Lankan G.C.E. A/L benchmarking.
      </div>

      {errorMsg ? (
        <p className="form-error">{errorMsg}</p>
      ) : students.length === 0 ? (
        <div className="glass-card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>No Roster Data</h3>
          <p style={{ color: "var(--text-muted)" }}>
            Invite and accept students into {selectedCourse.title} to calculate Z-scores.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "1.5rem", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bg-card-border)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                <th style={{ padding: "0.75rem" }}>Student</th>
                <th style={{ padding: "0.75rem" }}>Subject Z-Scores</th>
                <th style={{ padding: "0.75rem" }}>Projected Composite Z</th>
                <th style={{ padding: "0.75rem" }}>Monte Carlo Band (P10 – P90)</th>
                <th style={{ padding: "0.75rem" }}>Status & Flags</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                const isContender = st.flags.includes("island_rank_contender");
                const isAtRisk = st.flags.includes("at_risk");

                return (
                  <tr
                    key={st.student_id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      background: isContender
                        ? "rgba(16, 185, 129, 0.05)"
                        : isAtRisk
                        ? "rgba(244, 63, 94, 0.05)"
                        : undefined,
                    }}
                  >
                    <td style={{ padding: "0.9rem 0.75rem" }}>
                      <div style={{ fontWeight: 600 }}>{st.student_name || "Student"}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{st.student_email}</div>
                    </td>

                    <td style={{ padding: "0.9rem 0.75rem", fontSize: "0.85rem" }}>
                      {Object.entries(st.subject_z).map(([subj, zVal]) => (
                        <div key={subj}>
                          {subj}: <strong style={{ color: zVal < -1.0 ? "var(--accent-rose)" : "var(--text-main)" }}>
                            {zVal >= 0 ? `+${zVal}` : zVal}
                          </strong>
                        </div>
                      ))}
                    </td>

                    <td style={{ padding: "0.9rem 0.75rem" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          color: st.composite_z >= 1.0 ? "var(--accent-emerald)" : st.composite_z < 0 ? "var(--accent-rose)" : "var(--text-main)",
                        }}
                      >
                        {st.composite_z >= 0 ? `+${st.composite_z}` : st.composite_z}
                      </span>
                    </td>

                    <td style={{ padding: "0.9rem 0.75rem", fontSize: "0.85rem" }}>
                      <div>P50 Median: <strong>{st.band.p50 >= 0 ? `+${st.band.p50}` : st.band.p50}</strong></div>
                      <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                        Range: [{st.band.p10 >= 0 ? `+${st.band.p10}` : st.band.p10} to {st.band.p90 >= 0 ? `+${st.band.p90}` : st.band.p90}]
                      </div>
                    </td>

                    <td style={{ padding: "0.9rem 0.75rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {isContender && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.6rem",
                              borderRadius: "9999px",
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "var(--accent-emerald)",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                            }}
                          >
                            🏆 Island-Rank Contender
                          </span>
                        )}

                        {isAtRisk && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.6rem",
                              borderRadius: "9999px",
                              background: "rgba(244, 63, 94, 0.2)",
                              color: "var(--accent-rose)",
                              border: "1px solid rgba(244, 63, 94, 0.4)",
                            }}
                          >
                            ⚠️ At Risk
                          </span>
                        )}

                        {!isContender && !isAtRisk && (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>On Track</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
