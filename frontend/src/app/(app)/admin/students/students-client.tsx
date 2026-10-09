"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Award,
  Zap,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import type { RegisteredStudent } from "@/lib/db/admin";

export function StudentsClient({ students }: { students: RegisteredStudent[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "high" | "new">("all");

  // Summary Metrics
  const totalStudents = students.length;
  const activeStudents = useMemo(
    () => students.filter((s) => s.total_sessions > 0).length,
    [students]
  );
  const totalSessionsCount = useMemo(
    () => students.reduce((acc, s) => acc + s.completed_sessions, 0),
    [students]
  );
  const overallAvgAccuracy = useMemo(() => {
    const studentsWithActivity = students.filter((s) => s.total_questions_attempted > 0);
    if (studentsWithActivity.length === 0) return 0;
    const totalCorrect = studentsWithActivity.reduce((acc, s) => acc + s.total_correct, 0);
    const totalQuestions = studentsWithActivity.reduce(
      (acc, s) => acc + s.total_questions_attempted,
      0
    );
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  }, [students]);

  // Filtering
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      // Search matching
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.subjects_practiced.some((subj) => subj.toLowerCase().includes(q)) ||
        (s.top_subject_name && s.top_subject_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Tab matching
      if (filterTab === "active") return s.total_sessions > 0;
      if (filterTab === "high") return s.high_score_percentage >= 80;
      if (filterTab === "new") return s.total_sessions === 0;
      return true;
    });
  }, [students, searchQuery, filterTab]);

  return (
    <div>
      {/* STATS OVERVIEW CARDS */}
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
                background: "#e0e7ff",
                color: "#4338ca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Registered Students
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{totalStudents}</div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Total student accounts</span>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#dcfce7",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Active Learners
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{activeStudents}</div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% active
            participation
          </span>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "#fef3c7",
                color: "#b45309",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Completed Sessions
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{totalSessionsCount}</div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Practice exams submitted</span>
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
              <Award size={20} />
            </div>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              Platform Accuracy
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{overallAvgAccuracy}%</div>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Average score on practice</span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        className="card"
        style={{
          marginBottom: "20px",
          padding: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "420px" }}>
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
            placeholder="Search by name, email, or subject..."
            style={{ paddingLeft: "36px", margin: 0, width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn btn-sm ${filterTab === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterTab("all")}
          >
            All ({totalStudents})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterTab === "active" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterTab("active")}
          >
            Active ({activeStudents})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterTab === "high" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterTab("high")}
          >
            High Performers (80%+)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterTab === "new" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterTab("new")}
          >
            Not Started ({totalStudents - activeStudents})
          </button>
        </div>
      </div>

      {/* STUDENTS TABLE */}
      {filteredStudents.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <Users size={48} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "6px" }}>
            No Students Found
          </h3>
          <p className="muted" style={{ maxWidth: "400px", margin: "0 auto 16px" }}>
            {searchQuery
              ? `No student matching "${searchQuery}" was found. Try adjusting your search query.`
              : "No students match this filter criteria."}
          </p>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery("");
                setFilterTab("all");
              }}
            >
              Clear Filter
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "260px" }}>Student</th>
                  <th>Joined Date</th>
                  <th>Sessions</th>
                  <th>Questions & Accuracy</th>
                  <th>Top Performance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => {
                  const initials = (st.name || "S")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const hasActivity = st.total_sessions > 0;

                  return (
                    <tr key={st.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
                              {st.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                              {st.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: "0.8125rem", color: "var(--foreground)" }}>
                          {formatDate(st.registered_at)}
                        </span>
                      </td>

                      <td>
                        <div>
                          <span className="badge badge-neutral">
                            {st.total_sessions} {st.total_sessions === 1 ? "session" : "sessions"}
                          </span>
                          {st.completed_sessions > 0 && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--muted)",
                                marginTop: "3px",
                              }}
                            >
                              {st.completed_sessions} submitted
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        {hasActivity ? (
                          <div style={{ minWidth: "140px" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.75rem",
                                marginBottom: "4px",
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>{st.accuracy_percentage}%</span>
                              <span style={{ color: "var(--muted)" }}>
                                {st.total_correct}/{st.total_questions_attempted} correct
                              </span>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: 6,
                                borderRadius: 3,
                                background: "#e2e8f0",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(st.accuracy_percentage, 100)}%`,
                                  height: "100%",
                                  background:
                                    st.accuracy_percentage >= 75
                                      ? "#16a34a"
                                      : st.accuracy_percentage >= 50
                                      ? "#eab308"
                                      : "#dc2626",
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                            No questions yet
                          </span>
                        )}
                      </td>

                      <td>
                        {st.top_subject_name ? (
                          <div>
                            <span className="badge badge-blue">{st.top_subject_name}</span>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#4f46e5",
                                marginTop: "3px",
                              }}
                            >
                              High Score: {st.high_score_percentage}%
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>—</span>
                        )}
                      </td>

                      <td>
                        {st.total_sessions > 0 ? (
                          st.accuracy_percentage >= 80 ? (
                            <span className="badge badge-green">Top Learner</span>
                          ) : (
                            <span className="badge badge-blue">Active Learner</span>
                          )
                        ) : (
                          <span className="badge badge-neutral">New Student</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <Link
                          href="/admin/leaderboard"
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          Leaderboard
                          <ArrowUpRight size={14} />
                        </Link>
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
