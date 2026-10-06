import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, CheckCheck, ClipboardList, GraduationCap, Languages, Mail, Sparkles } from "lucide-react";
import { respondToInviteAction } from "@/app/actions/student";
import { ActionForm } from "@/components/action-form";
import { requireRole } from "@/lib/auth/guards";
import { listEnrollmentsForStudent } from "@/lib/db/queries";
import StudentProgress from "@/components/student-progress";
import styles from "./student.module.css";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await requireRole("student");
  const enrollments = await listEnrollmentsForStudent(user.id);

  const invited = enrollments.filter((row) => row.status === "invited");
  const active = enrollments.filter((row) => row.status === "accepted");
  const declined = enrollments.filter((row) => row.status === "declined");

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHead}>
        <div><p className={styles.eyebrow}>YOUR LEARNING SPACE</p><h1>Welcome back, {user.name.split(" ")[0] || "student"}.</h1><p>One paper at a time. Build on what you know.</p></div>
        <a href="#courses" className={styles.courseLink}><GraduationCap size={18} aria-hidden="true" /> My courses <span>{active.length}</span></a>
      </header>

      <section className={styles.hero} aria-labelledby="study-heading">
        <div className={styles.heroCopy}>
          <span className={styles.heroBadge}><Sparkles size={15} aria-hidden="true" /> A clearer path to progress</span>
          <h2 id="study-heading">Find your next<br />learning moment.</h2>
          <p>Take a self-assessment, understand the answers you missed, and turn the right theory into your next step.</p>
          <div className={styles.heroActions}><Link href="/exams/self-assessment" className={styles.primary}>Start self-assessment <ArrowRight size={18} aria-hidden="true" /></Link><Link href="/exams/self-assessment#learning-history" className={styles.secondary}>View learning history</Link></div>
          <div className={styles.languageNote}><Languages size={16} aria-hidden="true" /><span>Choose from the languages available for your subject.</span></div>
        </div>
        <div className={styles.heroArt}><Image src="/images/student-study.png" alt="Two students studying together with a laptop and notebooks" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 500px" preload /><span className={styles.artCaption}><BookOpen size={15} aria-hidden="true" /> Small steps. Stronger understanding.</span></div>
      </section>

      <StudentProgress />

      <section className={styles.routine} aria-labelledby="routine-heading">
        <div><p className={styles.eyebrow}>MAKE EACH PAPER COUNT</p><h2 id="routine-heading">Your study rhythm</h2></div>
        <ol className={styles.steps}>
          <li><span className={styles.stepIcon}><ClipboardList size={21} aria-hidden="true" /></span><div><h3>01 · Check what you know</h3><p>Choose a subject, language and paper. Save a draft if you need a break.</p></div></li>
          <li><span className={styles.stepIcon}><BookOpen size={21} aria-hidden="true" /></span><div><h3>02 · Understand the gaps</h3><p>Review your answers, explanations and the theory behind each topic.</p></div></li>
          <li><span className={styles.stepIcon}><CheckCheck size={21} aria-hidden="true" /></span><div><h3>03 · Put it into practice</h3><p>Try the suggested follow-up, then compare your saved topic evidence.</p></div></li>
        </ol>
      </section>

      <div className={styles.sectionHead} id="courses"><div><p className={styles.eyebrow}>LEARN WITH YOUR TEACHERS</p><h2>My courses</h2></div><span className={styles.courseCount}>{active.length} enrolled · {invited.length} invitation{invited.length === 1 ? "" : "s"}</span></div>
      <div className={styles.courseGrid}>
      <section className={styles.courseSection}>
        <h3 className={styles.columnTitle}><Mail size={18} aria-hidden="true" /> Invitations <span>{invited.length}</span></h3>

        {invited.length === 0 ? (
          <div className={styles.empty}><Mail size={26} aria-hidden="true" /><h4>You’re all caught up</h4><p>When a teacher invites you to a course, you can accept it here.</p></div>
        ) : (
          <ul className="stack">
            {invited.map((row) => (
              <li key={row.enrollment_id} className={`glass-card ${styles.courseCard}`}>
                <div className="row-between">
                  <div>
                    <h3 className="card-title">{row.course_title}</h3>
                    <p className="muted">
                      {row.teacher_name ?? "A teacher"} &middot; invited {formatDate(row.invited_at)}
                    </p>
                  </div>
                  <code className="join-code">{row.course_code}</code>
                </div>

                <p>{row.course_description ?? "No description provided."}</p>

                <div className="inline-form">
                  <ActionForm action={respondToInviteAction} className="inline-form">
                    <input type="hidden" name="enrollmentId" value={row.enrollment_id} />
                    <button type="submit" name="response" value="accepted" className="btn btn-primary">
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="response"
                      value="declined"
                      className="btn btn-secondary"
                    >
                      Decline
                    </button>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.courseSection}>
        <h3 className={styles.columnTitle}><GraduationCap size={18} aria-hidden="true" /> Enrolled courses <span>{active.length}</span></h3>

        {active.length === 0 ? (
          <div className={styles.empty}><GraduationCap size={28} aria-hidden="true" /><h4>Your next chapter starts here</h4><p>Ask your teacher to invite your account email. You can still take available self-assessments independently.</p></div>
        ) : (
          <ul className="stack">
            {active.map((row) => (
              <li key={row.enrollment_id} className={`glass-card ${styles.courseCard}`}>
                <div className="row-between">
                  <h3 className="card-title">{row.course_title}</h3>
                  <span className="badge badge-green">enrolled</span>
                </div>
                <p className="muted">
                  {row.teacher_name ?? "A teacher"} &middot; {row.teacher_email}
                </p>
                {row.course_description ? <p>{row.course_description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

      {declined.length > 0 ? (
        <details className={styles.declined}>
          <summary>Declined invitations ({declined.length})</summary>
          <ul className="stack">
            {declined.map((row) => (
              <li key={row.enrollment_id} className="glass-card row-between">
                <span>{row.course_title}</span>
                <span className="badge badge-red">declined</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
