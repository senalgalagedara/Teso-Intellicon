"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Search,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { AdminSubjectRow, LeaderboardEntry } from "@/lib/db/admin";
import { syncLeaderboardAction } from "@/app/actions/admin";

export function LeaderboardClient({
  subjects,
  currentSubjectId,
  entries,
  stats,
}: {
  subjects: AdminSubjectRow[];
  currentSubjectId: string;
  entries: LeaderboardEntry[];
  stats: {
    totalCompetitors: number;
    topScore: number;
    avgScore: number;
    subjectChampion: string | null;
  };
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === currentSubjectId),
    [subjects, currentSubjectId]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.student_name.toLowerCase().includes(q) ||
        e.student_email.toLowerCase().includes(q) ||
        e.subject_name.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const top3 = useMemo(() => {
    return filteredEntries.slice(0, 3);
  }, [filteredEntries]);

  const remainingEntries = useMemo(() => {
    return filteredEntries.slice(3);
  }, [filteredEntries]);

  const handleSubjectChange = (subjectId: string) => {
    if (subjectId === "all" || !subjectId) {
      router.push("/admin/leaderboard");
    } else {
      router.push(`/admin/leaderboard?subject=${subjectId}`);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncLeaderboardAction();
      if (res.success) {
        setSyncMessage(res.success);
        router.refresh();
      } else if (res.error) {
        setSyncMessage(`Error: ${res.error}`);
      }
    } catch {
      setSyncMessage("Failed to sync leaderboard.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  return (
    <div>
      {/* SUBJECT FILTER BAR */}
      <div
        className="card"
        style={{
          marginBottom: "24px",
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--foreground)" }}>
            Subject:
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${!currentSubjectId || currentSubjectId === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleSubjectChange("all")}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`btn btn-sm ${currentSubjectId === sub.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleSubjectChange(sub.id)}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSync}
            disabled={isSyncing}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={isSyncing ? "spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Scores"}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          className="card"
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: syncMessage.startsWith("Error") ? "#fee2e2" : "#dcfce7",
            borderColor: syncMessage.startsWith("Error") ? "#fca5a5" : "#86efac",
            color: syncMessage.startsWith("Error") ? "#991b1b" : "#166534",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {syncMessage}
        </div>
      )}

      {/* METRIC OVERVIEW CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Crown size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Top Performer
            </span>
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {stats.subjectChampion || "—"}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Highest recorded rank
          </span>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trophy size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Highest Score
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            {stats.topScore > 0 ? `${stats.topScore}%` : "—"}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Best accuracy achieved
          </span>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#e0e7ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Average Score
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            {stats.avgScore > 0 ? `${stats.avgScore}%` : "—"}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Mean performance across tests
          </span>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#f3e8ff",
                color: "#7e22ce",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Ranked Competitors
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            {stats.totalCompetitors}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {selectedSubject ? `Students tested in ${selectedSubject.name}` : "Across all subjects"}
          </span>
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY (IF WE HAVE ENTRIES) */}
      {top3.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "14px" }}>
            🏆 Top Performers Podium
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {top3.map((entry, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;

              const bgGradient = isFirst
                ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                : isSecond
                ? "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
                : "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)";

              const borderColor = isFirst
                ? "#fcd34d"
                : isSecond
                ? "#cbd5e1"
                : "#fdba74";

              const badgeColor = isFirst
                ? "#d97706"
                : isSecond
                ? "#64748b"
                : "#c2410c";

              return (
                <div
                  key={entry.id || `${entry.subject_id}-${entry.student_id}`}
                  className="card"
                  style={{
                    background: bgGradient,
                    borderColor: borderColor,
                    position: "relative",
                    overflow: "hidden",
                    padding: "22px 20px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#fff",
                      padding: "4px 10px",
                      borderRadius: "16px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: badgeColor,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    {isFirst && <Crown size={14} />}
                    {isSecond && <Medal size={14} />}
                    {isThird && <Award size={14} />}
                    Rank #{rank}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: isFirst
                          ? "linear-gradient(135deg, #f59e0b, #d97706)"
                          : isSecond
                          ? "linear-gradient(135deg, #94a3b8, #64748b)"
                          : "linear-gradient(135deg, #fb923c, #ea580c)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "1.125rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {entry.student_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.0625rem" }}>
                        {entry.student_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {entry.student_email || "Student"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: badgeColor }}>
                      {entry.score_percentage}%
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>High Score</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      borderTop: `1px solid ${borderColor}`,
                      paddingTop: "10px",
                    }}
                  >
                    <span>Subject: <strong>{entry.subject_name}</strong></span>
                    <span>
                      {entry.correct_answers}/{entry.total_questions} correct
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH AND FULL RANKING TABLE */}
      <div
        className="card"
        style={{
          marginBottom: "16px",
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: "380px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or subject..."
            style={{ paddingLeft: "36px", margin: 0, width: "100%" }}
          />
        </div>

        <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
          Showing <strong>{filteredEntries.length}</strong> ranked score
          {filteredEntries.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <Trophy size={48} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "6px" }}>
            No High Scores Recorded
          </h3>
          <p className="muted" style={{ maxWidth: "420px", margin: "0 auto 16px" }}>
            {selectedSubject
              ? `No practice sessions have been submitted for ${selectedSubject.name} yet. Once students take practice tests, their high scores will appear here automatically.`
              : "No high score records found yet. Sync scores or wait for students to complete practice tests."}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync From Sessions Now"}
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "70px", textAlign: "center" }}>Rank</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>High Score</th>
                  <th>Accuracy Details</th>
                  <th>Mastery Level</th>
                  <th>Achieved On</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => {
                  const isTop1 = e.rank === 1;
                  const isTop2 = e.rank === 2;
                  const isTop3 = e.rank === 3;

                  return (
                    <tr key={`${e.subject_id}-${e.student_id}-${e.rank}`}>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            fontWeight: 800,
                            fontSize: "0.8125rem",
                            background: isTop1
                              ? "#fef3c7"
                              : isTop2
                              ? "#f1f5f9"
                              : isTop3
                              ? "#ffedd5"
                              : "#f3f4f6",
                            color: isTop1
                              ? "#b45309"
                              : isTop2
                              ? "#475569"
                              : isTop3
                              ? "#c2410c"
                              : "#6b7280",
                          }}
                        >
                          {e.rank}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "#e0e7ff",
                              color: "#4338ca",
                              fontWeight: 700,
                              fontSize: "0.8125rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {e.student_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
                              {e.student_name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                              {e.student_email || "Student"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong>{e.subject_name}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            {e.stream}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "1.125rem",
                              fontWeight: 800,
                              color:
                                e.score_percentage >= 85
                                  ? "#16a34a"
                                  : e.score_percentage >= 60
                                  ? "#eab308"
                                  : "#dc2626",
                            }}
                          >
                            {e.score_percentage}%
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ minWidth: "120px" }}>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                            {e.correct_answers} / {e.total_questions} correct
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 5,
                              borderRadius: 3,
                              background: "#e2e8f0",
                              overflow: "hidden",
                              marginTop: 3,
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(e.score_percentage, 100)}%`,
                                height: "100%",
                                background:
                                  e.score_percentage >= 85
                                    ? "#16a34a"
                                    : e.score_percentage >= 60
                                    ? "#eab308"
                                    : "#dc2626",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        {e.score_percentage >= 90 ? (
                          <span className="badge badge-green">Mastery (90%+)</span>
                        ) : e.score_percentage >= 75 ? (
                          <span className="badge badge-blue">Proficient (75%+)</span>
                        ) : (
                          <span className="badge badge-neutral">Developing</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                          {formatDate(e.achieved_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d);
  } catch {
    return "—";
  }
}
