"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Trophy,
  Flame,
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  StopCircle,
  Award,
  Check,
  Zap,
  BarChart2,
  Home,
  LogOut,
  User,
  GraduationCap,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { ApiError, readProblem, messageForError } from "@/lib/api/problems";
import type {
  Exam,
  Paper,
  Session,
  Result,
  Question,
  LearningHistory,
  CheckAnswerResult,
} from "@/lib/assessment-types";
import styles from "@/app/exams/self-assessment/assessment.module.css";

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
  if (!ids || ids.length === 0) return null;
  return (
    <div style={{ margin: "14px 0" }}>
      {ids.map((id) => (
        <div key={id} style={{ maxWidth: "480px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assessments/sessions/${sid}/media/${id}`}
            alt={`Diagram ${id}`}
            style={{ width: "100%", height: "auto", display: "block" }}
            onError={(e) => {
              e.currentTarget.alt = "Diagram unavailable. Please reload.";
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function SelfAssessmentDashboard({
  showTopNav = true,
  embedded = false,
  initialTab = "practice",
  initialUserName,
  initialUserEmail,
}: {
  showTopNav?: boolean;
  embedded?: boolean;
  initialTab?: "practice" | "history";
  initialUserName?: string;
  initialUserEmail?: string;
}) {
  const router = useRouter();

  // Navigation / Tabs: 'practice' | 'history'
  const [activeTab, setActiveTab] = useState<"practice" | "history">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialTab === "history") {
      setExam(null);
      setResult(null);
    }
  }, [initialTab]);

  // User Profile & Header State
  const [userName, setUserName] = useState<string>(initialUserName || "ශිෂ්‍යයා");
  const [userEmail, setUserEmail] = useState<string>(initialUserEmail || "student@teso.lk");
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Core Data
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [history, setHistory] = useState<LearningHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Unlimited Practice State
  const [exam, setExam] = useState<Exam | null>(null);
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [poolIndex, setPoolIndex] = useState<number>(0);
  const [choices, setChoices] = useState<Record<string, string | null>>({});
  const [checks, setChecks] = useState<Record<string, CheckAnswerResult>>({});
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [runFinished, setRunFinished] = useState<boolean>(false);

  // Results State (when reviewing past paper)
  const [result, setResult] = useState<Result | null>(null);

  // Language filter
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load High Score & User Profile on client
  useEffect(() => {
    try {
      const savedHigh = localStorage.getItem("teso_self_assessment_high_score");
      if (savedHigh) {
        setHighScore(parseInt(savedHigh, 10) || 0);
      }
    } catch {
      // Local storage unavailable
    }

    async function loadUser() {
      try {
        const { data: sessionData } = await authClient.getSession();
        if (sessionData?.user) {
          setUserName(sessionData.user.name || "ශිෂ්‍යයා");
          setUserEmail(sessionData.user.email || "student@teso.lk");
        }
      } catch {
        // Fallback to defaults
      }
    }
    void loadUser();
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      document.cookie = "teso_demo=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    } catch (e) {
      console.error("Sign out failed", e);
      router.replace("/sign-in");
    } finally {
      setLoggingOut(false);
    }
  };

  const openSession = useCallback(async (sid: string) => {
    const e = await api<Exam>(`sessions/${sid}`);
    setExam(e);
    setChoices(e.drafts || {});
    setChecks({});
    setRunFinished(false);
    setIsNewHighScore(false);
    window.history.replaceState(null, "", `?session=${sid}`);

    if (e.status === "submitted") {
      const [r, h] = await Promise.all([
        api<Result>(`sessions/${sid}/results`),
        api<LearningHistory>("history"),
      ]);
      setResult(r);
      setHistory(h);
    } else {
      setQuestionPool(e.questions || []);
      setPoolIndex(0);
      setCurrentScore(0);
      setCurrentStreak(0);
      setQuestionsAnswered(0);
      setResult(null);
    }
  }, []);

  const loadData = useCallback(async () => {
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
        await loadData();
        const sid = new URLSearchParams(window.location.search).get("session");
        if (active && sid) await openSession(sid);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          setShowAuth(true);
          return;
        }
        setLoadFailed(true);
        setError(messageForError(e, "ඇගයීම් සේවාව සම්බන්ධ කර ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [loadData, openSession]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setShowAuth(true);
        return;
      }
      setError(messageForError(e, "දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න."));
    } finally {
      setBusy(false);
    }
  }

  const startSubjectPractice = async (subjectId: string) => {
    const matchingPaper =
      papers.find((p) => p.subject_id === subjectId && p.content_language === selectedLanguage) ||
      papers.find((p) => p.subject_id === subjectId) ||
      papers[0];

    if (!matchingPaper) {
      setError("මෙම විෂය සඳහා ප්‍රශ්න හමු නොවීය.");
      return;
    }

    await runAction(async () => {
      const s = await api<{ session_id: string }>("sessions", "POST", {
        paper_id: matchingPaper.id,
        language: selectedLanguage,
      });
      await openSession(s.session_id);
    });
  };

  const currentQ = questionPool.length > 0 ? questionPool[poolIndex % questionPool.length] : null;
  const currentQUniqueKey = currentQ ? `${currentQ.id}-${poolIndex}` : "";
  const checkedResult = currentQ ? checks[currentQUniqueKey] : undefined;
  const isChecked = Boolean(checkedResult);
  const selectedOption = currentQ ? choices[currentQUniqueKey] ?? null : null;

  const handleCheckAnswer = async () => {
    if (!exam || !currentQ || !selectedOption || isChecking) return;

    setIsChecking(true);
    setError("");
    try {
      const res = await api<CheckAnswerResult>(`sessions/${exam.session_id}/check`, "POST", {
        question_id: currentQ.id,
        selected_option: selectedOption,
      });

      setChecks((prev) => ({ ...prev, [currentQUniqueKey]: res }));
      setQuestionsAnswered((prev) => prev + 1);

      if (res.is_correct) {
        const addedMarks = res.marks || 1;
        const newScore = currentScore + addedMarks;
        setCurrentScore(newScore);
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);

        if (newScore > highScore) {
          setHighScore(newScore);
          setIsNewHighScore(true);
          try {
            localStorage.setItem("teso_self_assessment_high_score", String(newScore));
          } catch {
            // Ignore storage errors
          }
        }
      } else {
        setCurrentStreak(0);
      }
    } catch (e) {
      setError(messageForError(e, "ඔබගේ පිළිතුර තහවුරු කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න."));
    } finally {
      setIsChecking(false);
    }
  };

  const handleNextQuestion = () => {
    setPoolIndex((prev) => prev + 1);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleStopAndSave = async () => {
    if (!exam) return;
    await runAction(async () => {
      const answers = Object.entries(choices).map(([key, opt]) => ({
        question_id: key.split("-")[0],
        selected_option: opt,
      }));

      await api(`sessions/${exam.session_id}/submit`, "POST", { answers });
      setRunFinished(true);

      if (currentScore > highScore) {
        setHighScore(currentScore);
        setIsNewHighScore(true);
        try {
          localStorage.setItem("teso_self_assessment_high_score", String(currentScore));
        } catch {
          // ignore
        }
      }

      await loadData();
    });
  };

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

  const totalAnsweredGlobal = history
    ? history.attempts.reduce((sum, a) => sum + (a.score.correct + a.score.incorrect), 0)
    : sessions.length * 3;

  const totalCorrectGlobal = history
    ? history.attempts.reduce((sum, a) => sum + a.score.correct, 0)
    : 0;

  const globalAccuracy =
    totalAnsweredGlobal > 0 ? Math.round((totalCorrectGlobal / totalAnsweredGlobal) * 100) : 0;

  return (
    <div className={`${styles.dashboard} ${embedded ? styles.embedded : ""}`}>
      {/* 1. TOP HEADER (Optional if inside app shell) */}
      {showTopNav && (
        <header className={styles.topNav}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.navBrand}>
              <div className={styles.brandIcon}>
                <GraduationCap size={18} />
              </div>
              <span>Teso Intellicon</span>
            </Link>

            <div className={styles.navDivider} />

            <Link href="/" className={styles.navHomeBtn}>
              <Home size={15} />
              <span>මුල් පිටුව</span>
            </Link>

            <Link href="/dashboard" className={styles.navLink}>
              <LayoutDashboard size={15} />
              <span>උපකරණ පුවරුව</span>
            </Link>
          </div>

          <div className={styles.navRight}>
            <div className={styles.headerHighScorePill}>
              <Trophy size={15} color="#d97706" />
              <span>ඉහළම: {highScore} ලකුණු</span>
            </div>

            <div className={styles.profileMenuContainer} ref={profileMenuRef}>
              <button
                type="button"
                className={styles.profileBtn}
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label="User Profile"
              >
                <div className={styles.avatar}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className={styles.profileName}>{userName}</span>
                <ChevronDown
                  size={14}
                  className={`${styles.chevronIcon} ${profileMenuOpen ? styles.chevronOpen : ""}`}
                />
              </button>

              {profileMenuOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownName}>{userName}</p>
                    <p className={styles.dropdownEmail}>{userEmail}</p>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link
                    href="/dashboard"
                    className={styles.dropdownItem}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <User size={15} />
                    <span>උපකරණ පුවරුව</span>
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button
                    type="button"
                    className={styles.dropdownItemDanger}
                    disabled={loggingOut}
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>{loggingOut ? "ඉවත් වෙමින්..." : "ගිණුමෙන් ඉවත් වන්න"}</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
              disabled={loggingOut}
              title="ගිණුමෙන් ඉවත් වන්න"
            >
              <LogOut size={15} />
              <span>{loggingOut ? "..." : "ඉවත් වන්න"}</span>
            </button>
          </div>
        </header>
      )}

      {/* 2. SUB-HEADER / DASHBOARD TITLE */}
      <div className={styles.dashHeader}>
        <div>
          <h1 className={styles.dashTitle}>ස්වයං ඇගයීම සහ පුහුණුව</h1>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#059669",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "0.875rem",
          }}
        >
          {notice}
        </div>
      )}

      {/* Auth Gate for Student */}
      {showAuth && (
        <div className={styles.summaryCard} style={{ margin: "24px auto" }}>
          <div className={styles.summaryIconWrap} style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <Award size={36} />
          </div>
          <h2 className={styles.summaryTitle}>ශිෂ්‍ය ගිණුමක් අවශ්‍යයි</h2>
          <p className={styles.summaryDesc}>
            ඔබේ ලකුණු නිරීක්ෂණය කිරීමට, වාර්තා සුරැකීමට සහ විෂය ප්‍රවීණතා ඉතිහාසය ගොඩනැගීමට ගිණුමට ඇතුළු වන්න.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/sign-in?next=/exams/self-assessment"
              className={styles.checkBtn}
              style={{ textDecoration: "none" }}
            >
              ඇතුළු වන්න
            </Link>
            <Link
              href="/sign-up"
              className={styles.actionBtn}
              style={{ textDecoration: "none", padding: "10px 20px" }}
            >
              ගිණුමක් සාදන්න
            </Link>
          </div>
          {demoAvailable && (
            <div style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <button
                type="button"
                className={styles.actionBtn}
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    await api("demo", "POST", {});
                    await loadData();
                  })
                }
              >
                නිරූපණ මාදිලිය අරඹන්න
              </button>
            </div>
          )}
        </div>
      )}

      {loading && !showAuth && (
        <p style={{ textAlign: "center", color: "#64748b", margin: "40px 0" }}>
          ඇගයීම් පුවරුව පූරණය වෙමින් පවතී...
        </p>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      {!exam && !result && !loading && !showAuth && (
        <>
          {/* Top Navigation Tabs - hidden when embedded since Practice & Subjects and Attempt History are in the sidebar */}
          {!embedded && (
            <div className={styles.tabNav}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "practice" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab("practice")}
              >
                <BookOpen size={16} />
                පුහුණුව සහ විෂයයන්
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "history" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <HistoryIcon size={16} />
                පුහුණු ඉතිහාසය ({sessions.length})
              </button>
            </div>
          )}

          {/* Quick KPI Stats Row */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>සමස්ත ඉහළම ලකුණු</span>
                <span className={styles.statValue}>{highScore} ලකුණු</span>
              </div>
              <div className={styles.statIconWrap} style={{ color: "#d97706", background: "#fffbeb" }}>
                <Trophy size={22} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>සම්පූර්ණ කළ වාර</span>
                <span className={styles.statValue}>{sessions.length}</span>
              </div>
              <div className={styles.statIconWrap} style={{ color: "#4f46e5", background: "#eef2ff" }}>
                <Zap size={22} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>විසඳූ ප්‍රශ්න ගණන</span>
                <span className={styles.statValue}>{totalAnsweredGlobal}</span>
              </div>
              <div className={styles.statIconWrap} style={{ color: "#059669", background: "#ecfdf5" }}>
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>සමස්ත නිවැරදිතාව</span>
                <span className={styles.statValue}>
                  {globalAccuracy > 0 ? `${globalAccuracy}%` : "—"}
                </span>
              </div>
              <div className={styles.statIconWrap} style={{ color: "#8b5cf6", background: "#f5f3ff" }}>
                <BarChart2 size={22} />
              </div>
            </div>
          </div>

          {/* TAB 1: SUBJECT TILES */}
          {activeTab === "practice" && (
            <section>
              <div className={styles.sectionHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>පවතින විෂයයන්</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#64748b" }}>
                    අසීමිත ප්‍රශ්න පුහුණුව ආරම්භ කිරීමට විෂයයක් තෝරන්න. ඔබ නවතා සුරකින තෙක් ප්‍රශ්න අඛණ්ඩව ලැබෙනු ඇත!
                  </p>
                </div>
              </div>

              {subjectList.length === 0 ? (
                <div className={styles.questionCard} style={{ textAlign: "center", padding: "40px" }}>
                  <p style={{ color: "#64748b" }}>මෙම අවස්ථාවේ ප්‍රකාශිත ප්‍රශ්න නොමැත.</p>
                </div>
              ) : (
                <div className={styles.subjectGrid}>
                  {subjectList.map((sub) => (
                    <div key={sub.id} className={styles.subjectTile}>
                      <div>
                        <div className={styles.tileTop}>
                          <div className={styles.tileIcon}>📚</div>
                          {sub.isDevelopment ? (
                            <span className={styles.tileBadge}>නියැදි අභ්‍යාස</span>
                          ) : (
                            <span
                              className={styles.tileBadge}
                              style={{ background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" }}
                            >
                              සක්‍රීය ප්‍රශ්න බැංකුව
                            </span>
                          )}
                        </div>

                        <h3 className={styles.tileTitle}>{sub.name}</h3>
                        <p className={styles.tileDesc}>
                          අනුවර්තී බහුවරණ ප්‍රශ්න පුහුණුව. පියවරෙන් පියවර විසඳුම් සහ සිද්ධාන්ත සමඟ ප්‍රශ්න එකින් එක විසඳන්න.
                        </p>

                        <div className={styles.tileMeta}>
                          <div className={styles.tileMetaItem}>
                            <Sparkles size={16} color="#6366f1" />
                            <span>අසීමිත පුහුණු මාදිලිය</span>
                          </div>
                          <div className={styles.tileMetaItem}>
                            <Trophy size={16} color="#d97706" />
                            <span>පෞද්ගලික ඉහළම ලකුණු</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.startBtn}
                        disabled={busy}
                        onClick={() => void startSubjectPractice(sub.id)}
                      >
                        අසීමිත පුහුණුව අරඹන්න
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: ATTEMPT HISTORY */}
          {activeTab === "history" && (
            <section>
              <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <div>
                    <h3 className={styles.sectionTitle}>ඔබගේ පුහුණු ඉතිහාසය</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                      ඔබගේ පසුගිය පුහුණු වාර, නිවැරදිතා ප්‍රතිශත සහ සවිස්තරාත්මක ප්‍රශ්න පැහැදිලි කිරීම් සමාලෝචනය කරන්න.
                    </p>
                  </div>
                  <span
                    style={{
                      background: "#f1f5f9",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    වාර්තාගත උත්සාහයන් {sessions.length}
                  </span>
                </div>

                {sessions.length === 0 ? (
                  <p style={{ color: "#64748b", padding: "20px 0", textAlign: "center" }}>
                    තවමත් සම්පූර්ණ කළ පුහුණු වාර නොමැත. ඉහතින් ඔබගේ පළමු පුහුණු වාරය ආරම්භ කරන්න!
                  </p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>දිනය</th>
                          <th>විෂය / ප්‍රශ්න පත්‍රය</th>
                          <th>තත්ත්වය</th>
                          <th>ලකුණු / දක්ෂතාව</th>
                          <th style={{ textAlign: "right" }}>ක්‍රියාව</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => {
                          const matchingAttempt = history?.attempts.find(
                            (a) => a.session_id === s.id
                          );
                          const percentage = matchingAttempt?.score.percentage;

                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 500, color: "#64748b" }}>
                                {new Date(s.started_at * 1000).toLocaleDateString()}
                              </td>
                              <td style={{ fontWeight: 600 }}>{s.paper_id}</td>
                              <td>
                                <span
                                  className={styles.badge}
                                  style={{
                                    background: s.status === "submitted" ? "#ecfdf5" : "#fffbeb",
                                    color: s.status === "submitted" ? "#059669" : "#d97706",
                                  }}
                                >
                                  {s.status === "submitted" ? "සම්පූර්ණයි" : "සිදු වෙමින් පවතී"}
                                </span>
                              </td>
                              <td>
                                {percentage !== undefined ? (
                                  <span
                                    className={`${styles.badge} ${percentage >= 70
                                      ? styles.badgeHigh
                                      : percentage >= 50
                                        ? styles.badgeMid
                                        : styles.badgeLow
                                      }`}
                                  >
                                    {matchingAttempt?.score.awarded_marks} /{" "}
                                    {matchingAttempt?.score.total_marks} ({percentage}%)
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>කෙටුම්පතක් වාර්තා විය</span>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className={styles.actionBtn}
                                  disabled={busy}
                                  onClick={() => void runAction(() => openSession(s.id))}
                                >
                                  {s.status === "submitted" ? "ප්‍රශ්න පත්‍රය සමාලෝචනය →" : "ඉදිරියට යන්න"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Concept Mastery Breakdown */}
              {history && history.concepts.length > 0 && (
                <div className={styles.historyCard}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: "16px" }}>
                    මාතෘකා ප්‍රවීණතාව සහ සංකල්ප ප්‍රගතිය
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                    {history.concepts.map((c) => (
                      <div
                        key={`${c.concept_id}-${c.content_language}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "16px",
                          background: "#ffffff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
                            {c.subject_name}
                          </span>
                          <span
                            className={styles.badge}
                            style={{
                              background: c.latest_percentage >= 70 ? "#ecfdf5" : "#fffbeb",
                              color: c.latest_percentage >= 70 ? "#059669" : "#d97706",
                            }}
                          >
                            {c.latest_percentage}%
                          </span>
                        </div>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem", fontWeight: 600 }}>
                          {c.concept_name}
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                          {c.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 4. PRACTICE MODE (Unlimited Questions) */}
      {exam && !runFinished && !result && exam.status === "in_progress" && currentQ && (
        <div className={styles.practiceContainer}>
          <div className={styles.practiceBar}>
            <div className={styles.practiceStats}>
              <div className={`${styles.pill} ${styles.pillScore}`}>
                <Zap size={15} />
                <span>ලකුණු: {currentScore}</span>
              </div>

              <div className={`${styles.pill} ${styles.pillHigh}`}>
                <Trophy size={15} />
                <span>ඉහළම ලකුණු: {highScore}</span>
              </div>

              {currentStreak > 1 && (
                <div className={`${styles.pill} ${styles.pillStreak}`}>
                  <Flame size={15} />
                  <span>{currentStreak} අඛණ්ඩ නිවැරදි!</span>
                </div>
              )}

              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
                ප්‍රශ්නය #{poolIndex + 1}
              </span>
            </div>

            <button
              type="button"
              className={styles.stopBtn}
              disabled={busy || isChecking}
              onClick={handleStopAndSave}
            >
              <StopCircle size={15} />
              නවතා ලකුණු සුරකින්න
            </button>
          </div>

          <div className={styles.questionCard}>
            <div className={styles.questionBadgeRow}>
              <span className={styles.qIndexBadge}>
                ප්‍රශ්නය {poolIndex + 1} &middot; ලකුණු {currentQ.marks || 1}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                මාදිලිය: අසීමිත පුහුණුව
              </span>
            </div>

            <h3 className={styles.qText}>{currentQ.text}</h3>
            <Media ids={currentQ.media_ids} sid={exam.session_id} />

            <div className={styles.optionsList}>
              {currentQ.options.map((o) => {
                const isSelected = selectedOption === o.id;
                let itemClass = styles.optionItem;

                if (checkedResult) {
                  itemClass += ` ${styles.optionDisabled}`;
                  if (o.id === checkedResult.correct_option_id) {
                    itemClass += ` ${styles.optionCorrect}`;
                  } else if (isSelected && !checkedResult.is_correct) {
                    itemClass += ` ${styles.optionIncorrect}`;
                  }
                } else if (isSelected) {
                  itemClass += ` ${styles.optionSelected}`;
                }

                return (
                  <div
                    key={o.id}
                    className={itemClass}
                    onClick={() => {
                      if (!isChecked && !isChecking && !busy) {
                        setChoices((prev) => ({ ...prev, [currentQUniqueKey]: o.id }));
                      }
                    }}
                  >
                    <div
                      className={`${styles.radioCircle} ${isSelected ? styles.radioCircleActive : ""
                        }`}
                    >
                      {isSelected && <div className={styles.radioCircleDot} />}
                    </div>

                    <span className={styles.optionText}>
                      <strong>{o.id.toUpperCase()}.</strong> {o.text}
                      <Media ids={o.media_ids} sid={exam.session_id} />
                    </span>

                    {checkedResult && o.id === checkedResult.correct_option_id && (
                      <span className={`${styles.optionBadge} ${styles.badgeSuccess}`}>
                        <Check size={13} />
                        නිවැරදියි
                      </span>
                    )}

                    {checkedResult && isSelected && !checkedResult.is_correct && (
                      <span className={`${styles.optionBadge} ${styles.badgeDanger}`}>
                        <XCircle size={13} />
                        වැරදියි
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {checkedResult && (
              <div
                className={`${styles.feedbackBox} ${checkedResult.is_correct ? styles.feedbackCorrect : styles.feedbackIncorrect
                  }`}
              >
                <div
                  className={`${styles.feedbackHeader} ${checkedResult.is_correct
                    ? styles.feedbackHeaderCorrect
                    : styles.feedbackHeaderIncorrect
                    }`}
                >
                  {checkedResult.is_correct ? (
                    <>
                      <CheckCircle2 size={18} />
                      නිවැරදියි! +{checkedResult.marks || 1} ලකුණු
                    </>
                  ) : (
                    <>
                      <XCircle size={18} />
                      වැරදියි &mdash; නිවැරදි පිළිතුර {checkedResult.correct_option_id.toUpperCase()} වේ
                    </>
                  )}
                </div>

                {checkedResult.base_explanation && (
                  <p className={styles.explanationText}>{checkedResult.base_explanation}</p>
                )}

                {checkedResult.resources && checkedResult.resources.length > 0 && (
                  <div className={styles.theoryAccordion}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      📖 අධ්‍යයන සටහන් සහ සිද්ධාන්ත
                    </span>
                    {checkedResult.resources.map((r) => (
                      <details key={r.id} className={styles.theoryDetails}>
                        <summary>{r.title}</summary>
                        <p style={{ margin: "6px 0", color: "#475569" }}>{r.theory}</p>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#4f46e5", textDecoration: "underline" }}
                          >
                            මූලාශ්‍ර ලේඛනය බලන්න ↗
                          </a>
                        )}
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.questionActions}>
              {!isChecked ? (
                <button
                  type="button"
                  className={styles.checkBtn}
                  disabled={!selectedOption || isChecking || busy}
                  onClick={handleCheckAnswer}
                >
                  {isChecking ? "පරීක්ෂා කරමින්..." : "පිළිතුර පරීක්ෂා කරන්න"}
                </button>
              ) : (
                <button type="button" className={styles.nextBtn} onClick={handleNextQuestion}>
                  මීළඟ ප්‍රශ්නය
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. RUN FINISHED SUMMARY / HIGH SCORE CELEBRATION */}
      {runFinished && (
        <div className={styles.summaryCard}>
          <div className={styles.summaryIconWrap}>
            <Trophy size={36} />
          </div>

          {isNewHighScore && (
            <div className={styles.newHighScoreBadge}>
              <Sparkles size={14} />
              නව සමස්ත ඉහළම ලකුණු වාර්තාවක්!
            </div>
          )}

          <h2 className={styles.summaryTitle}>
            {isNewHighScore ? "විශිෂ්ටයි! 🎉" : "පුහුණු වාරය අවසන්!"}
          </h2>
          <p className={styles.summaryDesc}>
            මෙම පුහුණු වාරයේදී ඔබ ප්‍රශ්න {questionsAnswered} කට පිළිතුරු ලබා දුන්නා.
          </p>

          <div className={styles.scoreBanner}>
            <div className={styles.scoreItem}>
              <span className={styles.scoreItemLabel}>අවසාන ලකුණු</span>
              <span className={styles.scoreItemVal} style={{ color: "#4f46e5" }}>
                {currentScore} ලකුණු
              </span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreItemLabel}>සමස්ත ඉහළම ලකුණු</span>
              <span className={styles.scoreItemVal} style={{ color: "#d97706" }}>
                {highScore} ලකුණු
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className={styles.checkBtn}
              onClick={() => {
                setExam(null);
                setRunFinished(false);
                setResult(null);
                window.history.replaceState(null, "", window.location.pathname);
                void loadData();
              }}
            >
              නැවත උපකරණ පුවරුවට
            </button>
          </div>
        </div>
      )}

      {/* 6. COMPREHENSIVE RESULT REVIEW */}
      {result && (
        <div style={{ animation: "fadeIn 0.25s ease-out" }}>
          <div className={styles.questionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span className={styles.qIndexBadge}>ප්‍රතිඵල සමාලෝචනය</span>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => {
                  setExam(null);
                  setResult(null);
                  window.history.replaceState(null, "", window.location.pathname);
                  void loadData();
                }}
              >
                ← නැවත උපකරණ පුවරුවට
              </button>
            </div>

            <div className={styles.scoreBanner} style={{ margin: "20px 0" }}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreItemLabel}>ලකුණු</span>
                <span className={styles.scoreItemVal}>
                  {result.score.awarded_marks} / {result.score.total_marks}
                </span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreItemLabel}>නිවැරදිතාව</span>
                <span className={styles.scoreItemVal} style={{ color: "#059669" }}>
                  {result.score.percentage}%
                </span>
              </div>
              <div className={styles.scoreItem}>
                <span className={styles.scoreItemLabel}>දක්ෂතාව</span>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "#64748b" }}>
                  නිවැරදි {result.score.correct} &middot; වැරදි {result.score.incorrect}
                </span>
              </div>
            </div>

            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{result.interpretation}</p>
          </div>

          <div className={styles.historyCard}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: "20px" }}>
              සවිස්තරාත්මක ප්‍රශ්න විසඳුම්
            </h3>
            {result.questions.map((r, i) => (
              <div
                key={r.question.id}
                style={{
                  padding: "18px 0",
                  borderBottom: i < result.questions.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    ප්‍රශ්නය {i + 1}
                  </span>
                  <span
                    className={styles.badge}
                    style={{
                      background: r.answer.correct ? "#ecfdf5" : "#fef2f2",
                      color: r.answer.correct ? "#059669" : "#dc2626",
                    }}
                  >
                    {r.answer.correct ? "✓ නිවැරදියි" : "✗ වැරදියි"}
                  </span>
                </div>
                <p style={{ margin: "8px 0", fontSize: "1rem", color: "#0f172a" }}>
                  {r.question.text}
                </p>
                <Media ids={r.question.media_ids} sid={result.session_id} />

                <p style={{ margin: "8px 0", fontSize: "0.85rem", color: "#64748b" }}>
                  ඔබේ තේරීම: <strong>{r.answer.selected_option?.toUpperCase() || "කිසිවක් නැත"}</strong> &middot; නිවැරදි පිළිතුර:{" "}
                  <strong style={{ color: "#059669" }}>{r.question.correct_option_id.toUpperCase()}</strong>
                </p>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginTop: "10px",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    පැහැදිලි කිරීම
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#1e293b", lineHeight: 1.5 }}>
                    {r.analysis?.feedback.explanation || r.base_explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
