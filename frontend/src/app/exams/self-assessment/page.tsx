"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import History from "./learning-history";
import { ApiError, readProblem } from "@/lib/api/problems";
import type { Exam, Paper, Session, Result, Question, LearningHistory, Plan } from "@/lib/assessment-types";
import styles from "./assessment.module.css";

const languages: Record<string, string> = {en: "English", si: "සිංහල", ta: "தமிழ்"};
async function api<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(`/api/assessments/${path}`, { method, headers: { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data), cache: "no-store" });
  if (!response.ok) throw new ApiError(await readProblem(response));
  return response.json();
}
function Media({ ids, sid }: { ids: string[]; sid: string }) {
  return <>{ids.map(id => <div key={id} className={styles.media}>
    {/* Private images require the session cookie and cannot use a public optimiser. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/api/assessments/sessions/${sid}/media/${id}`} alt={`Assessment diagram ${id}`} onError={e => { e.currentTarget.alt = "Diagram unavailable. Please reload before answering."; }} />
  </div>)}</>;
}
function QuestionContent({ question, sid }: { question: Question; sid: string }) {
  return <><p>{question.text}</p><Media ids={question.media_ids} sid={sid} /></>;
}
export default function SelfAssessment() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [choices, setChoices] = useState<Record<string, string | null>>({});
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [paperLanguage, setPaperLanguage] = useState("en");
  const [history, setHistory] = useState<LearningHistory | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const openSession = useCallback(async (sid: string) => {
    const e = await api<Exam>(`sessions/${sid}`);
    setExam(e); setChoices(e.drafts); setResult(null); setPlan(null); setNotice("");
    window.history.replaceState(null, "", `?session=${sid}`);
    if (e.status === "submitted") {
      const [r, h] = await Promise.all([api<Result>(`sessions/${sid}/results`), api<LearningHistory>("history")]);
      setResult(r); setHistory(h);
      try { setPlan(await api<Plan>(`sessions/${sid}/recommendation`)); } catch { setNotice("Your grade is saved. A follow-up plan is currently unavailable."); }
    }
  }, []);
  const load = useCallback(async () => {
    const [p, s, h] = await Promise.all([api<{ papers: Paper[] }>("papers"), api<{ sessions: Session[] }>("sessions"), api<LearningHistory>("history")]);
    setPapers(p.papers); setSessions(s.sessions); setHistory(h); setShowAuth(false); setError("");
  }, []);
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const status = await api<{authenticated: boolean; demo_available: boolean}>("status");
        if (active) setDemoAvailable(status.demo_available);
        if (!status.authenticated) { if (active) setShowAuth(true); return; }
        await load();
        const sid = new URLSearchParams(window.location.search).get("session");
        if (active && sid) await openSession(sid);
      } catch (e) { if (active) { setShowAuth(true); setError((e as Error).message); } } finally { if (active) setLoading(false); }
    }
    void init(); return () => { active = false; };
  }, [load, openSession]);
  useEffect(() => {
    if (!result || !["queued", "processing"].includes(result.analysis_status)) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const r = await api<Result>(`sessions/${result!.session_id}/results`); if (active) setResult(r); }
      catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) timer = setTimeout(poll, 5000); }
    }
    timer = setTimeout(poll, 2500);
    return () => {active = false; clearTimeout(timer);};
  }, [result]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function answerBody() { return { answers: exam?.questions.map(q => ({ question_id: q.id, selected_option: choices[q.id] ?? null })) || [] }; }
  return <main className={styles.main}>
    <nav className={styles.breadcrumb}><Link href="/">Teso</Link><span>/</span><Link href="/exams">Exams</Link><span>/</span><span>Self-assessment</span></nav>
    <header className={styles.header}><div><p className={styles.eyebrow}>Learn from each response</p><h1>Self-assessment</h1><p>Complete a paper, review your results, and choose what to revise next.</p></div><Link href="/exams">Available resources →</Link></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {showAuth && <section className={styles.card}>
      <h2>Continue with your student account</h2>
      <p>Sign in to keep your assessments and theory progress attached to your student account.</p>
      <div className={styles.actions}><Link href="/sign-in?next=/exams/self-assessment">Sign in</Link><Link href="/sign-up">Create student account</Link></div>
      {demoAvailable && <><button disabled={busy} className={styles.secondary} onClick={() => void run(async () => { await api("demo", "POST", {}); await load(); })}>Try local development demo</button><p className={styles.muted}>Development sample questions and a separate local identity. Keep using the same browser and localhost address to retain this demo history.</p></>}
    </section>}
    {loading && <p role="status">Loading your student session...</p>}
    {!exam && !showAuth && !loading && <>
      <section className={styles.card}><h2>Choose your paper</h2>
        <label>1. Subject<select value={subject} onChange={e => {setSubject(e.target.value); const l = papers.find(p => p.subject_id === e.target.value)?.content_language || "en"; setPaperLanguage(l); setLanguage(l);}}><option value="">Choose a subject</option>{Array.from(new Map(papers.map(p => [p.subject_id, p.subject_name]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        {subject && <label>2. Paper language<select value={paperLanguage} onChange={e => {setPaperLanguage(e.target.value); setLanguage(e.target.value);}}>{Array.from(new Set(papers.filter(p => p.subject_id === subject).map(p => p.content_language))).map(l => <option key={l} value={l}>{languages[l]}</option>)}</select></label>}
        {subject && <label>Explanation language<select value={language} onChange={e => setLanguage(e.target.value)}>{Object.entries(languages).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
        {papers.length === 0 && <p>No published papers are available for this account yet.</p>}
        {subject && <h3>3. Select a paper</h3>}
        {papers.filter(p => p.subject_id === subject && p.content_language === paperLanguage).map(p => <div key={p.id} className={styles.row}><div><h3>{p.title}</h3><p>{p.question_count} questions · {languages[p.content_language]} · Version {p.version}{p.is_development && " · Development sample"}</p></div>
          <button disabled={busy} onClick={() => void run(async () => { const s = await api<{ session_id: string }>("sessions", "POST", { paper_id: p.id, language }); await openSession(s.session_id); })}>Start paper</button></div>)}
      </section>
      <section className={styles.card}><h2>Your saved assessments</h2>{sessions.length === 0 && <p>Your assessments will appear here.</p>}{sessions.map(s => <div key={s.id} className={styles.row}><span>{s.paper_id} · {s.status === "submitted" ? "Completed" : "In progress"}</span><button disabled={busy} onClick={() => void run(() => openSession(s.id))}>Reopen</button></div>)}</section>
    </>}
    {exam?.plan && !result && <section className={`${styles.card} ${styles.aiCard}`}><p className={`${styles.eyebrow} ${styles.eyebrowAi}`}>Adaptive plan</p><h2>Your personalized follow-up</h2><p>{exam.plan.explanation}</p>{exam.plan.warnings.map(w => <p key={w} className={styles.muted}>{w}</p>)}</section>}
    {exam && !result && exam.status === "in_progress" && <>
      {exam.is_development && <p className={styles.notice}>Development fixture — original sample questions, not expert-approved production content.</p>}
      {exam.questions.map((q, i) => <section key={q.id} className={styles.card}><h2>Question {i + 1}<small>{q.marks} marks</small></h2><QuestionContent question={q} sid={exam.session_id} />{exam.plan && <p className={styles.muted}>{exam.plan.selections.find(s => s.question_id === q.id)?.reason.replaceAll("_", " ")}{exam.plan.repeated_question_ids.includes(q.id) && " · Previously attempted"}</p>}
        <fieldset disabled={busy}><legend className={styles.srOnly}>Choose an answer for question {i + 1}</legend>{q.options.map(o => <label className={styles.option} key={o.id}><input type="radio" name={q.id} checked={choices[q.id] === o.id} onChange={() => setChoices({ ...choices, [q.id]: o.id })} /><span>{o.text}<Media ids={o.media_ids} sid={exam.session_id} /></span></label>)}</fieldset>
        <button className={styles.secondary} disabled={busy} onClick={() => setChoices({ ...choices, [q.id]: null })}>Clear answer</button>
      </section>)}
      <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={() => void run(async () => { await api(`sessions/${exam.session_id}/draft`, "PUT", answerBody()); setNotice("Draft saved. You can reopen this assessment later."); })}>Save draft</button>
        <button disabled={busy} onClick={() => void run(async () => { await api(`sessions/${exam.session_id}/submit`, "POST", answerBody()); await openSession(exam.session_id); })}>Submit paper ({Object.values(choices).filter(Boolean).length}/{exam.questions.length} answered)</button></div>
      <p className={styles.muted}>Submission is final. Unselected questions are saved as unanswered.</p>
    </>}
    {result && <>
      <section className={styles.card}><p className={styles.eyebrow}>Saved result{result.is_development && " · Development assessment"}</p><h2 className={styles.score}>{result.score.awarded_marks} / {result.score.total_marks}<span>{result.score.percentage}%</span></h2>
        <p>{result.score.correct} correct · {result.score.incorrect} incorrect · {result.score.unanswered} unanswered</p><p role="status">Analysis: {result.analysis_status}{["queued", "processing"].includes(result.analysis_status) && " — your score is saved while feedback is prepared."}{result.analysis_status === "partial" && " — reviewed explanations are supplied where AI feedback was unavailable."}{result.analysis_status === "failed" && " — your saved grade and reviewed solutions remain available."}</p><p className={styles.muted}>{result.interpretation}</p>
      </section>
      {plan && <section className={`${styles.card} ${styles.aiCard}`}><p className={`${styles.eyebrow} ${styles.eyebrowAi}`}>Recommended next</p><h2>Your next paper</h2><p>{plan.explanation}</p><p>{plan.question_count} questions planned · {plan.repeated_question_ids.length} repeated</p>{plan.warnings.map(w => <p className={styles.muted} key={w}>{w}</p>)}<button disabled={busy} onClick={() => void run(async () => { const next = await api<{session_id: string}>(`sessions/${result.session_id}/next`, "POST", {question_count: 10}); await openSession(next.session_id); })}>Start personalized next paper</button><p><a href="#learning-history">See your progress across papers</a></p></section>}
      <section className={styles.card}><h2>Concept performance & revision</h2>{result.concepts.map(c => <article key={c.concept_id} className={styles.concept}><h3>{c.unit_name} / {c.concept_name}</h3><p>{c.correct} correct · {c.incorrect} incorrect · {c.unanswered} unanswered · {c.percentage}% of marks</p><p>{c.recommendation}</p><small>Evidence: {c.evidence_question_ids.join(", ")}</small><p><a href={`#question-${c.evidence_question_ids[0]}`}>Review this concept & study resources ↓</a></p></article>)}</section>
      {result.questions.map((r, i) => <section className={styles.card} id={`question-${r.question.id}`} key={r.question.id}><h2>Question {i + 1}<small><span className={r.answer.selected_option === null ? "badge badge-neutral" : r.answer.correct ? "badge badge-green" : "badge badge-red"}>{r.answer.selected_option === null ? "Unanswered" : r.answer.correct ? "Correct" : "Incorrect"}</span> {r.answer.marks}/{r.question.marks}</small></h2>
        <QuestionContent question={r.question} sid={result.session_id} />
        <p className={styles.muted}>Your response: {r.answer.selected_option ?? "Unanswered"} · Approved answer: {r.question.correct_option_id}</p>
        {r.question.options.map(o => <div className={styles.reviewOption} key={o.id}><strong>{o.id}{o.id === r.question.correct_option_id ? " ✓" : ""}</strong> {o.text}<Media ids={o.media_ids} sid={result.session_id} /></div>)}
        <p className={styles.explanation}>{r.analysis?.feedback.explanation || r.base_explanation}</p>
        {r.analysis?.feedback.worked_solution && <p className={styles.explanation}>{r.analysis.feedback.worked_solution}</p>}
        {r.analysis?.feedback.selected_option_explanation && <p>{r.analysis.feedback.selected_option_explanation}</p>}
        <Media ids={r.question.solution_media_ids} sid={result.session_id} />
        <p>{r.analysis?.feedback.revision_action || "Review the supplied theory and solution."}</p>
        <p className={styles.muted}>{r.analysis ? (r.analysis.status === "ai_generated" ? `AI-generated feedback · ${r.analysis.provider} / ${r.analysis.model}` : r.analysis.status === "mock" ? "Local mock feedback using the base explanation" : `Reviewed fallback · ${r.analysis.fallback_reason}`) : "Reviewed base explanation · analysis pending or unavailable"}{r.analysis?.explanation_language === "reviewed_content" && " · Original reviewed language"}</p>
        <p>Question success rate: {r.success_rate.percentage === null ? "No eligible population data" : `${r.success_rate.percentage}% (${r.success_rate.numerator}/${r.success_rate.denominator}) · ${r.success_rate.sample_label.replaceAll("_", " ")}`}</p><details><summary>How the success rate is calculated</summary><p>{r.success_rate.population}</p></details>
        <h3>Study resources</h3>{r.resources.map(resource => <details key={resource.id}><summary>{resource.title}</summary><p>{resource.theory}</p>{resource.url && <a href={resource.url} target="_blank" rel="noopener noreferrer">Open approved resource ↗</a>}</details>)}
      </section>)}
    </>}
    {history && !showAuth && (!exam || result) && <History history={history} busy={busy} open={sid => {void run(() => openSession(sid));}} />}
    {exam && <button className={styles.secondary} disabled={busy} onClick={() => void run(async () => { setExam(null); setResult(null); window.history.replaceState(null, "", window.location.pathname); await load(); })}>Back to available papers</button>}
  </main>;
}
