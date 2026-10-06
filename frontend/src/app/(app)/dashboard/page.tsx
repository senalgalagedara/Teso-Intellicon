import Link from "next/link";

import { requireUser } from "@/lib/auth/guards";
import { listEnrollmentsForStudent, listTeacherRequests } from "@/lib/db/queries";
import { listCoursesForTeacher } from "@/lib/db/queries";
import { ROLE_LABELS } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

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

      {user.role === "student" ? <StudentSummary userId={user.id} /> : null}
      {user.role === "teacher" ? <TeacherSummary userId={user.id} /> : null}
      {user.role === "teacher_pending" ? <PendingSummary userId={user.id} /> : null}
      {user.role === "admin" ? <AdminSummary /> : null}
    </>
  );
}

async function StudentSummary({ userId }: { userId: string }) {
  const enrollments = await listEnrollmentsForStudent(userId);
  const invited = enrollments.filter((row) => row.status === "invited");
  const accepted = enrollments.filter((row) => row.status === "accepted");

  return (
    <>
      <div className="stat-row">
        <Stat
          label="Pending invitations"
          value={invited.length}
          tone={invited.length > 0 ? "warning" : undefined}
        />
        <Stat label="Active courses" value={accepted.length} />
      </div>

      {invited.length > 0 ? (
        <p className="notice notice-blue">
          You have {invited.length} pending course invitation{invited.length === 1 ? "" : "s"}.{" "}
          <Link href="/student">Review them</Link>.
        </p>
      ) : (
        <p className="notice">
          No invitations yet. Teachers invite students by email, so ask your teacher to add your
          address.
        </p>
      )}

      <div className="inline-form">
        <Link href="/student" className="btn btn-primary">
          Go to my courses
        </Link>
        <Link href="/exams/self-assessment" className="btn btn-secondary">
          Start a self-assessment
        </Link>
      </div>
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
  const requests = await listTeacherRequests();
  const pending = requests.filter((row) => row.status === "pending");

  return (
    <>
      <div className="stat-row">
        <Stat
          label="Awaiting approval"
          value={pending.length}
          tone={pending.length > 0 ? "warning" : undefined}
        />
        <Stat label="Reviewed requests" value={requests.length - pending.length} />
      </div>

      <Link href="/admin/teachers" className="btn btn-primary">
        Review teacher requests
      </Link>
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
