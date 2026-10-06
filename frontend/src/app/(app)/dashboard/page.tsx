import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { listTeacherRequests } from "@/lib/db/queries";
import { listCoursesForTeacher } from "@/lib/db/queries";
import { ROLE_LABELS } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "student") redirect("/student");

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="gradient-text">Welcome back, {user.name}</h1>
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
        <Stat label="Awaiting response" value={pending} />
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
        <Stat label="Awaiting approval" value={pending.length} />
        <Stat label="Reviewed requests" value={requests.length - pending.length} />
      </div>

      <Link href="/admin/teachers" className="btn btn-primary">
        Review teacher requests
      </Link>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat glass-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
