import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { listEnrollmentsForStudent } from "@/lib/db/queries";
import { getNextQuestionAction } from "@/app/actions/practice";
import { QuestionCard } from "@/components/question-card";

export const dynamic = "force-dynamic";

export default async function StudentPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireRole("student");
  const { courseId } = await searchParams;
  const enrollments = await listEnrollmentsForStudent(user.id);
  const activeCourses = enrollments.filter((e) => e.status === "accepted");

  if (activeCourses.length === 0) {
    return (
      <div className="page-head">
        <h1 className="gradient-text">Adaptive Practice</h1>
        <p className="notice" style={{ marginTop: "1.5rem" }}>
          You are not enrolled in any active courses yet. Please accept an invitation on your{" "}
          <Link href="/student" style={{ color: "var(--accent-purple)", textDecoration: "underline" }}>
            Courses dashboard
          </Link>{" "}
          to begin practicing.
        </p>
      </div>
    );
  }

  const selectedCourseId = courseId || activeCourses[0].course_id;
  const currentCourse = activeCourses.find((c) => c.course_id === selectedCourseId) || activeCourses[0];

  const nextResult = await getNextQuestionAction(selectedCourseId);

  return (
    <>
      <div className="page-head" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="gradient-text">Adaptive Practice</h1>
            <p className="page-subtitle">
              Practicing {currentCourse.course_title} &middot; Algorithmically tuned to your mastery zone (~70% target success).
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/student/review" className="btn btn-secondary">
              Review Due Cards
            </Link>
            <Link href="/student/progress" className="btn btn-secondary">
              Mastery Progress
            </Link>
          </div>
        </div>
      </div>

      {/* Course Switcher Pills */}
      {activeCourses.length > 1 && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
          {activeCourses.map((c) => (
            <Link
              key={c.course_id}
              href={`/student/practice?courseId=${c.course_id}`}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
                background: c.course_id === selectedCourseId ? "var(--gradient-brand)" : "var(--bg-card)",
                color: "var(--text-main)",
                border: "1px solid var(--bg-card-border)",
              }}
            >
              {c.course_title}
            </Link>
          ))}
        </div>
      )}

      {/* Practice Interactive Area */}
      {nextResult.ok ? (
        <QuestionCard
          key={nextResult.serveId}
          courseId={selectedCourseId}
          initialQuestion={nextResult.question}
          initialServeId={nextResult.serveId}
          initialReason={nextResult.reason}
        />
      ) : (
        <div className="glass-card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <h3 style={{ marginBottom: "0.75rem" }}>No Practice Questions Available</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            {nextResult.error || "The teacher has not added active questions to this course yet."}
          </p>
          <Link href="/student" className="btn btn-primary">
            Back to Courses
          </Link>
        </div>
      )}
    </>
  );
}
