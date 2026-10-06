"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CheckCheck, ChevronRight, CircleAlert, Clock3, FileCheck2, RotateCcw, Target } from "lucide-react";
import type { LearningAttempt, LearningConcept, LearningHistory } from "@/lib/assessment-types";
import styles from "./student-progress.module.css";

type LoadState = { status: "loading" } | { status: "error"; signIn: boolean } | { status: "ready"; history: LearningHistory };
type TopicEvidence = { concept: LearningConcept; attempt: LearningAttempt };

const languageNames: Record<string, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };
const languageName = (code: string) => languageNames[code] || code.toUpperCase();
const percentage = (value: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
const resultLink = (sessionId: string) => `/exams/self-assessment?session=${encodeURIComponent(sessionId)}`;

function latestTopics(attempts: LearningAttempt[]): TopicEvidence[] {
  const evidence = new Map<string, TopicEvidence>();
  for (const attempt of attempts) {
    for (const concept of attempt.concepts) {
      // Separate paper languages and take the latest real evidence for each topic.
      const key = JSON.stringify([concept.subject_id, concept.concept_id, attempt.content_language]);
      if (!evidence.has(key)) evidence.set(key, { concept, attempt });
    }
  }
  return [...evidence.values()];
}

export default function StudentProgress() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 25_000);
    async function loadHistory() {
      try {
        const response = await fetch("/api/assessments/history", { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (!disposed) setState({ status: "error", signIn: response.status === 401 });
          return;
        }
        const history: LearningHistory = await response.json();
        if (!Array.isArray(history.attempts)) throw new Error("Invalid history response");
        if (!disposed) setState({ status: "ready", history });
      } catch {
        if (!disposed) setState({ status: "error", signIn: false });
      } finally {
        clearTimeout(timeout);
      }
    }
    void loadHistory();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [retry]);

  if (state.status === "loading") return <section className={styles.loading} aria-busy="true" aria-label="Student assessment progress">
    <div className={styles.loadingIcon}><BookOpen size={24} aria-hidden="true" /></div>
    <div><h2>Your learning, in one place</h2><p role="status">Loading your saved assessments…</p></div>
  </section>;

  if (state.status === "error") return <section className={styles.message} aria-label="Student assessment progress">
    <CircleAlert size={26} aria-hidden="true" />
    <div><h2>{state.signIn ? "Reconnect your student account" : "Your progress is temporarily unavailable"}</h2>
      <p role="alert">{state.signIn ? "Sign in to see the assessments saved to your account." : "We couldn’t load your saved assessments. Please try again."}</p>
      <div className={styles.messageActions}>
        {state.signIn && <Link className={styles.textLink} href="/sign-in?next=/student">Sign in <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        <button className={styles.retry} type="button" onClick={() => { setState({ status: "loading" }); setRetry(value => value + 1); }}><RotateCcw size={15} aria-hidden="true" /> Retry</button>
      </div>
    </div>
  </section>;

  // Use real attempts directly: the API's aggregate history may also contain local demos.
  const attempts = state.history.attempts.filter(attempt => attempt.is_development === false)
    .sort((a, b) => b.submitted_at - a.submitted_at || b.session_id.localeCompare(a.session_id));
  const latest = attempts[0];
  const topics = latestTopics(attempts);
  const priorities = topics.filter(({ concept }) => concept.incorrect + concept.unanswered > 0)
    .sort((a, b) => a.concept.percentage - b.concept.percentage
      || (b.concept.incorrect + b.concept.unanswered) - (a.concept.incorrect + a.concept.unanswered)
      || a.concept.concept_name.localeCompare(b.concept.concept_name));

  return <div className={styles.progress}>
    <div className={styles.stats} aria-label="Saved assessment overview">
      <article className={styles.stat}><span className={`${styles.statIcon} ${styles.lilac}`}><FileCheck2 size={21} aria-hidden="true" /></span><div><p>Completed papers</p><strong>{attempts.length}</strong><span>Saved to your account</span></div></article>
      <article className={styles.stat}><span className={`${styles.statIcon} ${styles.teal}`}><CheckCheck size={21} aria-hidden="true" /></span><div><p>Latest paper score</p><strong>{latest ? `${percentage(latest.score.percentage)}%` : "—"}</strong><span>{latest ? languageName(latest.content_language) : "Complete your first paper"}</span></div></article>
      <article className={styles.stat}><span className={`${styles.statIcon} ${styles.peach}`}><Target size={21} aria-hidden="true" /></span><div><p>Topics to revisit</p><strong>{priorities.length}</strong><span>From each topic’s latest paper</span></div></article>
    </div>

    <div className={styles.panels}>
      <section className={styles.panel} aria-labelledby="revision-heading">
        <div className={styles.panelHeader}><div><p className={styles.eyebrow}>ONE STEP AT A TIME</p><h2 id="revision-heading">Your next focus</h2></div><span className={styles.headerIcon}><Target size={22} aria-hidden="true" /></span></div>
        {!latest ? <div className={styles.empty}><span className={styles.emptyIcon}><BookOpen size={27} aria-hidden="true" /></span><h3>Let’s find your starting point</h3><p>Complete a paper to see which theory topics need another look.</p><Link className={styles.primaryLink} href="/exams/self-assessment">Choose your first paper <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
          : priorities.length === 0 ? <div className={styles.empty}><span className={`${styles.emptyIcon} ${styles.teal}`}><CheckCheck size={27} aria-hidden="true" /></span><h3>No missed topics in your latest evidence</h3><p>Try another paper to revisit these topics and cover something new.</p><Link className={styles.primaryLink} href="/exams/self-assessment">Choose another paper <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
            : <div className={styles.topics}>{priorities.slice(0, 2).map(({ concept, attempt }, index) => <article className={styles.topic} key={`${concept.subject_id}-${concept.concept_id}-${attempt.content_language}`}>
              <div className={styles.topicHeading}><span className={styles.topicNumber}>0{index + 1}</span><div><h3>{concept.concept_name}</h3><p>{concept.subject_name} · {languageName(attempt.content_language)}</p></div><span className={styles.topicScore}>{percentage(concept.percentage)}%</span></div>
              <div className={styles.meter} role="meter" aria-label={`${concept.concept_name}, latest topic score in ${languageName(attempt.content_language)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={concept.percentage}><span style={{ width: `${Math.min(100, Math.max(0, concept.percentage))}%` }} /></div>
              <div className={styles.topicFooter}><p>{concept.incorrect} incorrect · {concept.unanswered} unanswered</p><Link href={resultLink(attempt.session_id)}>Review theory <ChevronRight size={15} aria-hidden="true" /></Link></div>
            </article>)}<p className={styles.evidenceNote}>Scores show your latest questions in each paper language. They are a starting point for revision.</p></div>}
      </section>

      <section className={styles.panel} aria-labelledby="recent-heading">
        <div className={styles.panelHeader}><div><p className={styles.eyebrow}>PAPER BY PAPER</p><h2 id="recent-heading">Recent assessments</h2></div><Link className={styles.viewAll} href="/exams/self-assessment#learning-history">History <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        {!latest ? <div className={styles.empty}><span className={styles.emptyIcon}><Clock3 size={27} aria-hidden="true" /></span><h3>Your story starts with one paper</h3><p>Your results, explanations, and topic history will appear here after submission.</p></div>
          : <div className={styles.recentList}>{attempts.slice(0, 3).map(attempt => <Link className={styles.recentPaper} key={attempt.session_id} href={resultLink(attempt.session_id)}>
            <span className={styles.paperIcon}><FileCheck2 size={20} aria-hidden="true" /></span><div className={styles.paperText}><h3>{attempt.title}</h3><p>{new Date(attempt.submitted_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {languageName(attempt.content_language)}</p><span>{attempt.activity_type === "adaptive_practice" ? "Personalized follow-up" : "Assessment"}{attempt.repeated_question_ids.length > 0 && ` · ${attempt.repeated_question_ids.length} repeated questions`}</span></div><span className={styles.paperScore}>{percentage(attempt.score.percentage)}%<ChevronRight size={15} aria-hidden="true" /></span>
          </Link>)}<p className={styles.evidenceNote}>Open a paper to see your saved result, explanations, and theory.</p></div>}
      </section>
    </div>
    <p className={styles.demoNote}>Development sample papers are excluded from this overview.</p>
  </div>;
}
