import Link from "next/link";

import { createCourseAction } from "@/app/actions/teacher";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth/guards";
import { listCoursesForTeacher } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TeacherCoursesPage() {
  const user = await requireRole("teacher");
  const courses = await listCoursesForTeacher(user.id);

  return (
    <>
      <div className="page-head">
        <h1 className="gradient-text">My courses</h1>
        <p className="page-subtitle">
          Create a course, then invite students by the email address they signed up with.
        </p>
      </div>

      <div className="glass-card">
        <h2 className="card-title">New course</h2>

        <ActionForm action={createCourseAction} className="stack-sm">
          <label className="field">
            <span>Title</span>
            <input className="input" name="title" required maxLength={200} />
          </label>

          <label className="field">
            <span>Description (optional)</span>
            <textarea className="textarea" name="description" maxLength={2000} />
          </label>

          <div>
            <SubmitButton pendingLabel="Creating...">Create course</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <section>
        <h2 className="section-title">Courses ({courses.length})</h2>

        {courses.length === 0 ? (
          <p className="notice">No courses yet. Create one above to start inviting students.</p>
        ) : (
          <ul className="stack">
            {courses.map((course) => (
              <li key={course.id} className="glass-card">
                <div className="row-between">
                  <div>
                    <h3 className="card-title">{course.title}</h3>
                    <p className="muted">{course.description ?? "No description."}</p>
                  </div>
                  <code className="join-code">{course.code}</code>
                </div>

                <p className="muted">
                  {course.student_count} enrolled, {course.pending_count} awaiting response.
                </p>

                <Link href={`/teacher/courses/${course.id}`} className="btn btn-primary">
                  Manage roster
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
