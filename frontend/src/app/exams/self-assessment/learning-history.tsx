"use client";
import type { LearningHistory } from "@/lib/assessment-types";
import styles from "./assessment.module.css";

const date = (seconds: number) => new Date(seconds * 1000).toLocaleDateString();
const change = (value: number | null) => value === null ? "පළමු වාර්තාව" : `${value > 0 ? "+" : ""}${value} ප්‍රතිශත ලකුණු`;

export default function History({ history, busy, open }: {history: LearningHistory; busy: boolean; open: (id: string) => void}) {
  return <section className={styles.card} id="learning-history">
    <p className={`${styles.eyebrow} ${styles.eyebrowAi}`}>ඔබගේ පුද්ගලීකරණය කළ ඉගෙනුම් ඉතිහාසය</p>
    <h2>සම්පූර්ණ කළ ප්‍රශ්න පත්‍ර {history.completed_count}</h2>
    <p className={styles.muted}>{history.interpretation}</p>
    {history.completed_count === 0 && <p>සිද්ධාන්ත මාතෘකා, අතපසු වූ ප්‍රශ්න සහ ප්‍රගතිය බැලීමට ඔබේ පළමු ප්‍රශ්න පත්‍රය සම්පූර්ණ කරන්න.</p>}
    {history.concepts.map(c => <details key={`${c.concept_id}-${c.content_language}`}>
      <summary>{c.subject_name} / {c.concept_name} ({c.content_language.toUpperCase()}) · {c.latest_percentage}% · {change(c.change_from_previous)}</summary>
      <p>{c.recommendation} {c.consecutive_missed_attempts > 1 && `අඛණ්ඩ උත්සාහයන් ${c.consecutive_missed_attempts} කදී අතපසු විය.`}</p>
      <p>පළමු: {c.first_percentage}% → නවතම: {c.latest_percentage}% · පළමු වාර්තාවේ සිට {change(c.change_from_first)}</p>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>ප්‍රශ්න පත්‍ර දිනය</th><th>මාතෘකා ලකුණු</th><th>පිළිතුරු</th><th>ප්‍රශ්න නිරාවරණය</th><th>සමාලෝචනය</th></tr></thead><tbody>
        {c.timeline.map(t => <tr key={t.session_id}><td>{date(t.submitted_at)}<br/>{t.activity_type === "adaptive_practice" ? "අනුගාමී පුහුණුව" : "ඇගයීම"}</td><td>{t.percentage}%</td><td>නිවැරදි {t.correct} / වැරදි {t.incorrect} / පිළිතුරු නොදුන් {t.unanswered}</td><td>නැවත නැවත ආ ප්‍රශ්න {t.repeated_questions}</td><td><button disabled={busy} onClick={() => open(t.session_id)}>විවෘත කරන්න</button></td></tr>)}
      </tbody></table></div>
    </details>)}
    <h3>ප්‍රශ්න පත්‍රය අනුව</h3>
    {history.attempts.map(a => <article key={a.session_id} className={styles.concept}>
      <div className={styles.row}><div><h3>{a.title} · {a.score.percentage}%</h3><p>{date(a.submitted_at)} · {a.content_language.toUpperCase()} · {a.activity_type === "adaptive_practice" ? "පුද්ගලීකරණය කළ අනුගාමී පුහුණුව" : "ඇගයීම"}{a.is_development && " · නියැදි අභ්‍යාස"}</p></div><button disabled={busy} onClick={() => open(a.session_id)}>ප්‍රශ්න පත්‍රය සමාලෝචනය</button></div>
      <p>පෙර උත්සාහ කළ ප්‍රශ්න {a.repeated_question_ids.length}</p>
      {a.concepts.map(c => <p key={c.concept_id}><strong>{c.unit_name} / {c.concept_name}</strong>: {c.percentage}% · වැරදි {c.incorrect}, පිළිතුරු නොදුන් {c.unanswered}{c.missed_question_ids.length > 0 && ` · අතපසු වූ: ${c.missed_question_ids.join(", ")}`}</p>)}
    </article>)}
  </section>;
}
