"use client";
import type { LearningHistory } from "@/lib/assessment-types";
import styles from "./assessment.module.css";

const date = (seconds: number) => new Date(seconds * 1000).toLocaleDateString();
const change = (value: number | null) => value === null ? "First evidence" : `${value > 0 ? "+" : ""}${value} percentage points`;

export default function History({ history, busy, open }: {history: LearningHistory; busy: boolean; open: (id: string) => void}) {
  return <section className={styles.card} id="learning-history">
    <p className={styles.eyebrow}>Your personalized learning history</p>
    <h2>{history.completed_count} completed papers</h2>
    <p className={styles.muted}>{history.interpretation}</p>
    {history.completed_count === 0 && <p>Complete your first paper to see theory topics, missed questions, and improvement here.</p>}
    {history.concepts.map(c => <details key={`${c.concept_id}-${c.content_language}`}>
      <summary>{c.subject_name} / {c.concept_name} ({c.content_language.toUpperCase()}) · {c.latest_percentage}% · {change(c.change_from_previous)}</summary>
      <p>{c.recommendation} {c.consecutive_missed_attempts > 1 && `Missed in ${c.consecutive_missed_attempts} consecutive attempts.`}</p>
      <p>First: {c.first_percentage}% → Latest: {c.latest_percentage}% · {change(c.change_from_first)} since first evidence</p>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Paper date</th><th>Topic score</th><th>Responses</th><th>Question exposure</th><th>Review</th></tr></thead><tbody>
        {c.timeline.map(t => <tr key={t.session_id}><td>{date(t.submitted_at)}<br/>{t.activity_type === "adaptive_practice" ? "Follow-up practice" : "Assessment"}</td><td>{t.percentage}%</td><td>{t.correct} correct / {t.incorrect} incorrect / {t.unanswered} unanswered</td><td>{t.repeated_questions} repeated questions</td><td><button disabled={busy} onClick={() => open(t.session_id)}>Open</button></td></tr>)}
      </tbody></table></div>
    </details>)}
    <h3>Paper by paper</h3>
    {history.attempts.map(a => <article key={a.session_id} className={styles.concept}>
      <div className={styles.row}><div><h3>{a.title} · {a.score.percentage}%</h3><p>{date(a.submitted_at)} · {a.content_language.toUpperCase()} · {a.activity_type === "adaptive_practice" ? "Personalized follow-up" : "Assessment"}{a.is_development && " · Development sample"}</p></div><button disabled={busy} onClick={() => open(a.session_id)}>Review paper</button></div>
      <p>{a.repeated_question_ids.length} previously attempted questions</p>
      {a.concepts.map(c => <p key={c.concept_id}><strong>{c.unit_name} / {c.concept_name}</strong>: {c.percentage}% · {c.incorrect} incorrect, {c.unanswered} unanswered{c.missed_question_ids.length > 0 && ` · Missed: ${c.missed_question_ids.join(", ")}`}</p>)}
    </article>)}
  </section>;
}
