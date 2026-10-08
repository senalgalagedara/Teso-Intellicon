import Link from "next/link";

import { requireUser } from "@/lib/auth/guards";
import { listTeacherRequests } from "@/lib/db/queries";
import { listCoursesForTeacher } from "@/lib/db/queries";
import { getAdminOverviewStats } from "@/lib/db/admin";
import { ROLE_LABELS } from "@/lib/auth/dal";
import SelfAssessmentDashboard from "@/components/self-assessment-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = (await searchParams) || {};
  const activeTab = tab === "history" ? "history" : "practice";

  if (user.role === "student") {
    return (
      <SelfAssessmentDashboard
        showTopNav={false}
        embedded={true}
        initialTab={activeTab}
        initialUserName={user.name}
        initialUserEmail={user.email}
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 style={{ marginTop: 8 }}>Welcome back, {user.name}</h1>
          <p className="page-subtitle">
            You are signed in as {ROLE_LABELS[user.role]} ({user.email}).
          </p>
        </div>
      </div>

      {user.role === "teacher" ? <TeacherSummary userId={user.id} /> : null}
      {user.role === "teacher_pending" ? <PendingSummary userId={user.id} /> : null}
      {user.role === "admin" ? <AdminSummary /> : null}
    </>
  );
}

async function TeacherSummary({ userId }: { userId: string }) {
  const courses = await listCoursesForTeacher(userId);
  const students = courses.reduce((total, course) => total + course.student_count, 0);
  const pending = courses.reduce((total, course) => total + course.pending_count, 0);

  return (
    <>
      <div className="stat-row">
        <Stat label="Courses" value={courses.length} />
        <Stat label="Enrolled students" value={students} />
        <Stat
          label="Awaiting response"
          value={pending}
          tone={pending > 0 ? "warning" : undefined}
        />
      </div>

      <Link href="/teacher" className="btn btn-primary">
        Manage courses and invite students
      </Link>
    </>
  );
}

async function PendingSummary({ userId }: { userId: string }) {
  const requests = await listTeacherRequests();
  const mine = requests.find((row) => row.user_id === userId);

  return (
    <p className="notice notice-yellow">
      Your teacher request is {mine?.status ?? "pending"}. An admin has to approve it before you
      can create courses. You can sign in and check back at any time.
    </p>
  );
}

async function AdminSummary() {
  let subjectCount = 0;
  let questionCount = 0;

  try {
    const stats = await getAdminOverviewStats();
    subjectCount = stats.subjectCount;
    questionCount = stats.questionCount;
  } catch (err) {
    console.error("[AdminSummary] failed to load stats:", err);
  }

  return (
    <>
      <div className="stat-row">
        <Stat label="Total Subjects" value={subjectCount} />
        <Stat label="Questions in Pool" value={questionCount} tone="success" />
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
        <Link href="/admin/subjects" className="btn btn-primary">
          Manage Subjects
        </Link>
        <Link href="/admin/questions" className="btn btn-secondary">
          Question Pool
        </Link>
        <Link href="/admin/questions/import" className="btn btn-secondary">
          Import Questions (CSV)
        </Link>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning" | "success";
}) {
  const valueClass = tone === "warning" ? " is-warning" : tone === "success" ? " is-success" : "";

  return (
    <div className="stat card">
      <span className={`stat-value${valueClass}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
