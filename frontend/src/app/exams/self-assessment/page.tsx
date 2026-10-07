"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import History from "./learning-history";
import { ApiError, readProblem, messageForError } from "@/lib/api/problems";
import type { Exam, Paper, Session, Result, Question, LearningHistory, Plan, CheckAnswerResult } from "@/lib/assessment-types";
import styles from "./assessment.module.css";

const languages: Record<string, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

async function api<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(`/api/assessments/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  if (!response.ok) throw new ApiError(await readProblem(response));
  return response.json();
}

function Media({ ids, sid }: { ids: string[]; sid: string }) {
  return (
    <>
      {ids.map((id) => (
        <div key={id} className={styles.media}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assessments/sessions/${sid}/media/${id}`}
            alt={`Assessment diagram ${id}`}
            onError={(e) => {
              e.currentTarget.alt = "Diagram unavailable. Please reload before answering.";
            }}
          />
        </div>
      ))}
    </>
  );
}

function QuestionContent({ question, sid }: { question: Question; sid: string }) {
  return (
    <>
      <p style={{ fontSize: "1.05rem", lineHeight: "1.6", margin: "14px 0" }}>{question.text}</p>
      <Media ids={question.media_ids} sid={sid} />
    </>
  );
}

export default function SelfAssessment() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [choices, setChoices] = useState<Record<string, string | null>>({});
  const [checks, setChecks] = useState<Record<string, CheckAnswerResult>>({});
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<LearningHistory | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const openSession = useCallback(async (sid: string) => {
    const e = await api<Exam>(`sessions/${sid}`);
    setExam(e);
    setChoices(e.drafts || {});
    setChecks({});
    setCurrentIndex(0);
    setResult(null);
    setPlan(null);
    setNotice("");
    window.history.replaceState(null, "", `?session=${sid}`);
    if (e.status === "submitted") {
      const [r, h] = await Promise.all([
        api<Result>(`sessions/${sid}/results`),
        api<LearningHistory>("history"),
      ]);
      setResult(r);
      setHistory(h);
      try {
        setPlan(await api<Plan>(`sessions/${sid}/recommendation`));
      } catch {
        setNotice("Your grade is saved. A follow-up plan is currently unavailable.");
      }
    }
  }, []);

  const load = useCallback(async () => {
    const [p, s, h] = await Promise.all([
      api<{ papers: Paper[] }>("papers"),
      api<{ sessions: Session[] }>("sessions"),
      api<LearningHistory>("history"),
    ]);
    setPapers(p.papers);
    setSessions(s.sessions);
    setHistory(h);
    setShowAuth(false);
    setError("");
    setLoadFailed(false);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const status = await api<{ authenticated: boolean; demo_available: boolean }>("status");
        if (active) setDemoAvailable(status.demo_available);
        if (!status.authenticated) {
          if (active) setShowAuth(true);
          return;
        }
        await load();
        const sid = new URLSearchParams(window.location.search).get("session");
        if (active && sid) await openSession(sid);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          setShowAuth(true);
          return;
        }
        setLoadFailed(true);
        setError(messageForError(e, "Couldn't reach the assessment service. Please check your backend connection."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [load, openSession]);

  useEffect(() => {
    if (!result || !["queued", "processing"].includes(result.analysis_status)) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const r = await api<Result>(`sessions/${result!.session_id}/results`);
        if (active) setResult(r);
      } catch (e) {
        if (active)
          setError(
            messageForError(
              e,
              "Couldn't update your result. Your score is already saved and you can check again in a moment."
            )
          );
      } finally {
        if (active) timer = setTimeout(poll, 5000);
      }
    }
    timer = setTimeout(poll, 2500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [result]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setShowAuth(true);
        return;
      }
      setError(messageForError(e, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function answerBody() {
    return {
      answers:
        exam?.questions.map((q) => ({
          question_id: q.id,
          selected_option: choices[q.id] ?? null,
        })) || [],
    };
  }

  const startSubjectPractice = async (subjectId: string) => {
    const matchingPaper =
      papers.find((p) => p.subject_id === subjectId && p.content_language === selectedLanguage) ||
      papers.find((p) => p.subject_id === subjectId) ||
      papers[0];

    if (!matchingPaper) {
      setError("No practice questions found for this subject.");
      return;
    }

    await run(async () => {
      const s = await api<{ session_id: string }>("sessions", "POST", {
        paper_id: matchingPaper.id,
        language: selectedLanguage,
      });
      await openSession(s.session_id);
    });
  };

  const handleCheckAnswer = async () => {
    if (!exam) return;
    const currentQ = exam.questions[currentIndex];
    const selected = choices[currentQ.id];
    if (!selected || isChecking) return;

    setIsChecking(true);
    setError("");
    try {
      const res = await api<CheckAnswerResult>(`sessions/${exam.session_id}/check`, "POST", {
        question_id: currentQ.id,
        selected_option: selected,
      });
      setChecks((prev) => ({ ...prev, [currentQ.id]: res }));
    } catch (e) {
      setError(messageForError(e, "Couldn't verify your answer. Please try again."));
    } finally {
      setIsChecking(false);
    }
  };

  const handleNextQuestion = () => {
    if (!exam) return;
    if (currentIndex < exam.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinishAssessment = async () => {
    if (!exam) return;
    await run(async () => {
      await api(`sessions/${exam.session_id}/submit`, "POST", answerBody());
      await openSession(exam.session_id);
    });
  };

  // Group papers by unique subject for intuitive Subject selection
  const subjectList = Array.from(
    new Map(
      papers.map((p) => [
        p.subject_id,
        {
          id: p.subject_id,
          name: p.subject_name,
          questionCount: papers
            .filter((x) => x.subject_id === p.subject_id)
            .reduce((max, curr) => Math.max(max, curr.question_count), 0),
          isDevelopment: p.is_development,
        },
      ])
    ).values()
  );

  const checkedCount = Object.keys(checks).length;
  const correctCount = Object.values(checks).filter((c) => c.is_correct).length;

  return (
    <main className={styles.main}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Teso</Link>
        <span>/</span>
        <Link href="/exams">Exams</Link>
        <span>/</span>
        <span>Self-assessment</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Adaptive Self-Assessment</p>
          <h1>Practice Questions One by One</h1>
          <p>Select your subject, answer questions one by one, and get instant feedback with full explanations.</p>
        </div>
        <Link href="/exams">Available resources →</Link>
      </header>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}

      {showAuth && (
        <section className={styles.card}>
          <h2>Continue with your student account</h2>
          <p>Sign in to save your assessments, scores, and spaced repetition progress.</p>
          <div className={styles.actions}>
            <Link href="/sign-in?next=/exams/self-assessment">Sign in</Link>
            <Link href="/sign-up">Create student account</Link>
          </div>
          {demoAvailable && (
            <>
              <button
                disabled={busy}
                className={styles.secondary}
                onClick={() =>
                  void run(async () => {
                    await api("demo", "POST", {});
                    await load();
                  })
                }
              >
                Try local development demo
              </button>
              <p className={styles.muted}>
                Sample questions and local identity for development testing.
              </p>
            </>
          )}
        </section>
      )}

      {loading && <p role="status">Loading your student session...</p>}

      {/* 1. SUBJECT SELECTION SCREEN */}
      {!exam && !showAuth && !loading && (
        <>
          {loadFailed && (
            <section className={styles.card}>
              <h2>Assessment service temporarily unreachable</h2>
              <p className={styles.muted}>
                Check that your FastAPI backend is running on port 8000 and try again.
              </p>
              <div className={styles.actions}>
                <button disabled={busy} onClick={() => void run(load)}>
                  Try again
                </button>
              </div>
            </section>
          )}

          <section className={styles.card}>
            <h2>Select a Subject to Practice</h2>
            <p className={styles.muted}>
              Pick a subject below. You will be served questions one by one with immediate answer checks and detailed solutions.
            </p>

            <div style={{ margin: "14px 0" }}>
              <label>
                Language
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{ maxWidth: "200px" }}
                >
                  {Object.entries(languages).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {subjectList.length === 0 ? (
              <p style={{ marginTop: "1rem" }}>No published questions available for this account yet.</p>
            ) : (
              <div className={styles.subjectGrid}>
                {subjectList.map((sub) => (
                  <div
                    key={sub.id}
                    className={styles.subjectCard}
                    onClick={() => void startSubjectPractice(sub.id)}
                  >
                    <div>
                      <div className={styles.subjectHeader}>
                        <div className={styles.subjectIcon}>📚</div>
                        {sub.isDevelopment && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "rgba(99, 102, 241, 0.1)",
                              color: "#6366f1",
                              fontWeight: 600,
                            }}
                          >
                            Sample Dev
                          </span>
                        )}
                      </div>
                      <h3 className={styles.subjectTitle}>{sub.name}</h3>
                      <p className={styles.muted}>
                        {sub.questionCount} Questions &middot; Step-by-step practice
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      style={{ marginTop: "12px", width: "100%" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void startSubjectPractice(sub.id);
                      }}
                    >
                      Start Practice →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Sessions List */}
          <section className={styles.card}>
            <h2>Your Saved Assessments</h2>
            {sessions.length === 0 && <p className={styles.muted}>Your past assessments will appear here.</p>}
            {sessions.map((s) => (
              <div key={s.id} className={styles.row}>
                <div>
                  <strong>{s.paper_id}</strong>
                  <p className={styles.muted}>
                    {s.status === "submitted" ? "Completed" : "In progress (draft saved)"} &middot;{" "}
                    {new Date(s.started_at * 1000).toLocaleDateString()}
                  </p>
                </div>
                <button disabled={busy} onClick={() => void run(() => openSession(s.id))}>
                  {s.status === "submitted" ? "View Results" : "Continue"}
                </button>
              </div>
            ))}
          </section>
        </>
      )}

      {/* 2. ONE-BY-ONE QUESTION PRACTICE VIEW */}
      {exam && !result && exam.status === "in_progress" && (
        <>
          {exam.is_development && (
            <p className={styles.notice}>
              Development fixture &mdash; sample questions for local testing.
            </p>
          )}

          {exam.questions.length > 0 && (() => {
            const currentQ = exam.questions[currentIndex] || exam.questions[0];
            const checkedResult = checks[currentQ.id];
            const isChecked = Boolean(checkedResult);
            const currentChoice = choices[currentQ.id] ?? null;

            return (
              <section className={styles.card}>
                {/* Header with Counter and Live Score */}
                <div className={styles.flowHeader}>
                  <button
                    type="button"
                    className={styles.secondary}
                    style={{ margin: 0, padding: "6px 12px", fontSize: "0.8rem" }}
                    onClick={() => {
                      setExam(null);
                      setResult(null);
                      window.history.replaceState(null, "", window.location.pathname);
                      void load();
                    }}
                  >
                    ← Change Subject
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {checkedCount > 0 && (
                      <span className={styles.liveBadge}>
                        🎯 {correctCount} / {checkedCount} correct
                      </span>
                    )}
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {currentQ.marks} marks
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressContainer}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      Question {currentIndex + 1} of {exam.questions.length}
                    </span>
                    <span>{Math.round(((currentIndex + 1) / exam.questions.length) * 100)}%</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${((currentIndex + 1) / exam.questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Content */}
                <h2 style={{ fontSize: "1.25rem", marginTop: "16px" }}>
                  Question {currentIndex + 1}
                </h2>
                <QuestionContent question={currentQ} sid={exam.session_id} />

                {/* Options List */}
                <fieldset disabled={busy || isChecking} style={{ marginTop: "18px" }}>
                  <legend className={styles.srOnly}>Options for question {currentIndex + 1}</legend>
                  {currentQ.options.map((o) => {
                    const isSelected = currentChoice === o.id;
                    let optionClass = styles.option;
                    if (isChecked) {
                      optionClass += ` ${styles.optionDisabled}`;
                      if (o.id === checkedResult.correct_option_id) {
                        optionClass += ` ${styles.optionCorrect}`;
                      } else if (isSelected && !checkedResult.is_correct) {
                        optionClass += ` ${styles.optionIncorrect}`;
                      }
                    }

                    return (
                      <label
                        key={o.id}
                        className={optionClass}
                        onClick={() => {
                          if (!isChecked && !busy && !isChecking) {
                            setChoices({ ...choices, [currentQ.id]: o.id });
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name={currentQ.id}
                          checked={isSelected}
                          disabled={isChecked || busy || isChecking}
                          onChange={() => setChoices({ ...choices, [currentQ.id]: o.id })}
                        />
                        <span style={{ flex: 1 }}>
                          <strong>{o.id.toUpperCase()}.</strong> {o.text}
                          <Media ids={o.media_ids} sid={exam.session_id} />
                        </span>

                        {isChecked && o.id === checkedResult.correct_option_id && (
                          <span className={`${styles.optionBadge} ${styles.badgeSuccess}`}>
                            ✓ Correct
                          </span>
                        )}
                        {isChecked && isSelected && !checkedResult.is_correct && (
                          <span className={`${styles.optionBadge} ${styles.badgeDanger}`}>
                            ✗ Incorrect
                          </span>
                        )}
                      </label>
                    );
                  })}
                </fieldset>

                {/* Instant Feedback Box (revealed when checked) */}
                {isChecked && (
                  <div
                    className={`${styles.feedbackBox} ${
                      checkedResult.is_correct ? styles.feedbackCorrect : styles.feedbackIncorrect
                    }`}
                  >
                    <div
                      className={`${styles.feedbackHeader} ${
                        checkedResult.is_correct
                          ? styles.feedbackHeaderCorrect
                          : styles.feedbackHeaderIncorrect
                      }`}
                    >
                      {checkedResult.is_correct ? (
                        <>🎉 Correct! Well done (+{checkedResult.marks} marks)</>
                      ) : (
                        <>❌ Incorrect &mdash; The correct answer is Option {checkedResult.correct_option_id.toUpperCase()}</>
                      )}
                    </div>
                    {checkedResult.base_explanation && (
                      <p style={{ margin: "8px 0 0", color: "var(--text)", lineHeight: "1.5" }}>
                        {checkedResult.base_explanation}
                      </p>
                    )}

                    {checkedResult.resources && checkedResult.resources.length > 0 && (
                      <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                        <h4 style={{ fontSize: "0.875rem", margin: "6px 0 4px", fontWeight: 700 }}>
                          📖 Related Theory
                        </h4>
                        {checkedResult.resources.map((r) => (
                          <details key={r.id} style={{ margin: "6px 0", fontSize: "0.85rem" }}>
                            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{r.title}</summary>
                            <p style={{ margin: "6px 0", color: "var(--text-secondary)" }}>{r.theory}</p>
                            {r.url && (
                              <a href={r.url} target="_blank" rel="noopener noreferrer">
                                Open study reference ↗
                              </a>
                            )}
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Navigation & Action Buttons */}
                <div
                  className={styles.actions}
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    {currentIndex > 0 && (
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={busy || isChecking}
                        onClick={() => setCurrentIndex((prev) => prev - 1)}
                      >
                        ← Previous
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {!isChecked ? (
                      <button
                        type="button"
                        disabled={!currentChoice || isChecking || busy}
                        onClick={handleCheckAnswer}
                        style={{ minWidth: "140px" }}
                      >
                        {isChecking ? "Checking..." : "Check Answer"}
                      </button>
                    ) : currentIndex < exam.questions.length - 1 ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleNextQuestion}
                        style={{ minWidth: "150px" }}
                      >
                        Next Question →
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleFinishAssessment}
                        style={{
                          minWidth: "170px",
                          background: "linear-gradient(135deg, #10b981, #059669)",
                        }}
                      >
                        Finish & View Results 🎉
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}
        </>
      )}

      {/* 3. FINAL RESULTS SCREEN */}
      {result && (
        <>
          <section className={styles.card}>
            <p className={styles.eyebrow}>
              Assessment Complete{result.is_development && " · Development Sample"}
            </p>
            <h2 className={styles.score}>
              {result.score.awarded_marks} / {result.score.total_marks}
              <span>{result.score.percentage}%</span>
            </h2>
            <p>
              {result.score.correct} correct &middot; {result.score.incorrect} incorrect &middot;{" "}
              {result.score.unanswered} unanswered
            </p>
            <p className={styles.muted}>{result.interpretation}</p>
            <div className={styles.actions} style={{ marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  setExam(null);
                  setResult(null);
                  window.history.replaceState(null, "", window.location.pathname);
                  void load();
                }}
              >
                Practice Another Subject →
              </button>
            </div>
          </section>

          {plan && (
            <section className={`${styles.card} ${styles.aiCard}`}>
              <p className={`${styles.eyebrow} ${styles.eyebrowAi}`}>Recommended Next</p>
              <h2>Your Next Practice Plan</h2>
              <p>{plan.explanation}</p>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const next = await api<{ session_id: string }>(
                      `sessions/${result.session_id}/next`,
                      "POST",
                      { question_count: 10 }
                    );
                    await openSession(next.session_id);
                  })
                }
              >
                Start Personalized Follow-up
              </button>
            </section>
          )}

          <section className={styles.card}>
            <h2>Concept Performance & Revision</h2>
            {result.concepts.map((c) => (
              <article key={c.concept_id} className={styles.concept}>
                <h3>
                  {c.unit_name} / {c.concept_name}
                </h3>
                <p>
                  {c.correct} correct &middot; {c.incorrect} incorrect &middot; {c.percentage}% score
                </p>
                <p>{c.recommendation}</p>
              </article>
            ))}
          </section>

          {/* Detailed Question Review */}
          <section className={styles.card}>
            <h2>Full Review & Explanations</h2>
            {result.questions.map((r, i) => (
              <div
                key={r.question.id}
                style={{
                  padding: "16px 0",
                  borderBottom: i < result.questions.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>Question {i + 1}</h3>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: r.answer.correct
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                      color: r.answer.correct ? "#059669" : "#dc2626",
                    }}
                  >
                    {r.answer.correct ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                </div>
                <QuestionContent question={r.question} sid={result.session_id} />
                <p className={styles.muted}>
                  Your answer: {r.answer.selected_option?.toUpperCase() ?? "None"} &middot; Correct option:{" "}
                  <strong>{r.question.correct_option_id.toUpperCase()}</strong>
                </p>
                <p className={styles.explanation}>
                  {r.analysis?.feedback.explanation || r.base_explanation}
                </p>
              </div>
            ))}
          </section>
        </>
      )}

      {history && !showAuth && (!exam || result) && (
        <History
          history={history}
          busy={busy}
          open={(sid) => {
            void run(() => openSession(sid));
          }}
        />
      )}
    </main>
  );
}
