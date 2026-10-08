"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Award,
  BookOpen,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Percent,
  TrendingDown,
  BookOpenCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCandidateExamReview } from "@/app/actions/candidate";

type Attempt = {
  participantId: string;
  sessionId: string;
  paperId: string;
  paperTitle: string;
  paperCode: string;
  status: string;
  score: number | null;
  answeredCount: number;
  totalQuestions: number;
  startedAt: string | null;
  submittedAt: string | null;
  lastSeenAt: string | null;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  grade: string;
  examType: string;
  stream: string;
  subjects: string[];
  registeredAt: string;
  attempts: Attempt[];
};

function statusConfig(status: string) {
  switch (status) {
    case "SUBMITTED":
      return { label: "Submitted", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
    case "IN_EXAM":
      return { label: "In Exam", color: "text-blue-600 bg-blue-50 border-blue-200", dot: "bg-blue-500 animate-pulse" };
    case "ADMITTED":
      return { label: "Admitted", color: "text-indigo-600 bg-indigo-50 border-indigo-200", dot: "bg-indigo-500" };
    case "WAITING":
      return { label: "Waiting", color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500" };
    case "KICKED":
      return { label: "Kicked", color: "text-red-650 bg-red-50 border-red-200", dot: "bg-red-500" };
    default:
      return { label: "Closed", color: "text-slate-500 bg-slate-100 border-slate-200", dot: "bg-slate-400" };
  }
}

export default function HostStudentsClient({
  candidates,
  loading,
  onRefresh
}: {
  candidates: Candidate[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [perfFilter, setPerfFilter] = useState("all");

  // Inspection states
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [inspectingAttempt, setInspectingAttempt] = useState<Attempt | null>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Compute overall list statistics
  const stats = useMemo(() => {
    const total = candidates.length;
    const totalAttempts = candidates.reduce((acc, c) => acc + c.attempts.length, 0);
    
    // Avg score computed from submitted scores
    const allSubmittedAttempts = candidates.flatMap(c => c.attempts).filter(a => a.score !== null);
    const avgScore = allSubmittedAttempts.length > 0
      ? allSubmittedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / allSubmittedAttempts.length
      : 0;

    const topPerformers = candidates.filter(c => {
      const cSubmitted = c.attempts.filter(a => a.score !== null);
      if (cSubmitted.length === 0) return false;
      const cAvg = cSubmitted.reduce((acc, a) => acc + (a.score || 0), 0) / cSubmitted.length;
      return cAvg >= 75;
    }).length;

    return { total, totalAttempts, avgScore, topPerformers };
  }, [candidates]);

  // Extract available streams for filtering
  const streams = useMemo(() => {
    const unique = new Set<string>();
    candidates.forEach(c => {
      if (c.stream && c.stream !== "N/A") unique.add(c.stream);
    });
    return Array.from(unique);
  }, [candidates]);

  // Filtered list
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.studentId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStream = streamFilter === "all" || c.stream === streamFilter;

      // Performance Filter bracket
      let matchesPerf = true;
      const cSubmitted = c.attempts.filter(a => a.score !== null);
      const cAvg = cSubmitted.length > 0
        ? cSubmitted.reduce((acc, a) => acc + (a.score || 0), 0) / cSubmitted.length
        : null;

      if (perfFilter === "top") {
        matchesPerf = cAvg !== null && cAvg >= 75;
      } else if (perfFilter === "mid") {
        matchesPerf = cAvg !== null && cAvg >= 45 && cAvg < 75;
      } else if (perfFilter === "low") {
        matchesPerf = cAvg !== null && cAvg < 45;
      } else if (perfFilter === "none") {
        matchesPerf = cSubmitted.length === 0;
      }

      return matchesSearch && matchesStream && matchesPerf;
    });
  }, [candidates, searchQuery, streamFilter, perfFilter]);

  // Open an attempt for detailed response review
  const handleInspectAttempt = async (attempt: Attempt, candidateId: string) => {
    setInspectingAttempt(attempt);
    setLoadingReview(true);
    setActiveQuestionIndex(0);

    const res = await getCandidateExamReview(attempt.paperId, candidateId);
    if (res.success && res.data) {
      setReviewData(res.data);
    } else {
      toast.error(res.error || "Failed to load review details for this attempt.");
      setInspectingAttempt(null);
    }
    setLoadingReview(false);
  };

  const handleCloseAttemptReview = () => {
    setInspectingAttempt(null);
    setReviewData(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-[var(--foreground-muted)] font-medium">Loading Candidates Directory...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-48px)] px-6 py-8 max-w-6xl mx-auto space-y-8 relative">
      {/* Ambient background blur blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-indigo-400/6 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-violet-400/5 blur-[100px] rounded-full" />
      </div>

      {/* Header hud */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Candidates</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Track and inspect registered students and exam performance trends.
          </p>
        </div>
        <div>
          <Button
            onClick={onRefresh}
            variant="outline"
            className="rounded-xl border-[var(--border)] hover:bg-slate-50 transition-colors gap-2 text-xs font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-[var(--foreground)] leading-none">{stats.total}</p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-wider mt-1">Total Candidates</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-[var(--foreground)] leading-none">{stats.topPerformers}</p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-wider mt-1">Top Performers</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <BookOpenCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-[var(--foreground)] leading-none">{stats.totalAttempts}</p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-wider mt-1">Total Attempts</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-black text-[var(--foreground)] leading-none">{stats.avgScore.toFixed(1)}%</p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-wider mt-1">Average Score</p>
          </div>
        </div>
      </div>

      {/* Filters HUD */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/50 border border-[var(--border)] p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-subtle)]" />
          <Input
            type="text"
            placeholder="Search by name, email, or student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-[var(--border)] text-sm rounded-xl focus:border-indigo-400 focus:ring-indigo-400/15"
          />
        </div>

        <div className="flex gap-2">
          {/* Stream Filter */}
          <select
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className="h-10 px-3 bg-white border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground)] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/15 cursor-pointer"
          >
            <option value="all">All Streams</option>
            {streams.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Performance Bracket Filter */}
          <select
            value={perfFilter}
            onChange={(e) => setPerfFilter(e.target.value)}
            className="h-10 px-3 bg-white border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground)] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/15 cursor-pointer"
          >
            <option value="all">All Levels</option>
            <option value="top">Top (≥75%)</option>
            <option value="mid">Average (45%-75%)</option>
            <option value="low">Needs Review (&lt;45%)</option>
            <option value="none">No Attempts</option>
          </select>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-[var(--foreground)] text-base">No candidates found</p>
              <p className="text-xs text-[var(--foreground-muted)] max-w-xs mx-auto mt-1">
                Try adjustment to filters or search parameters.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Candidate</th>
                  <th className="py-3.5 px-5">ID / Email</th>
                  <th className="py-3.5 px-5">Grade & Stream</th>
                  <th className="py-3.5 px-5 text-center">Attempts</th>
                  <th className="py-3.5 px-5 text-center">Avg. Score</th>
                  <th className="py-3.5 px-5">Latest Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((cand) => {
                  const initials = cand.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2);

                  // Calculate individual avg score
                  const submitted = cand.attempts.filter(a => a.score !== null);
                  const averageScore = submitted.length > 0
                    ? submitted.reduce((acc, a) => acc + (a.score || 0), 0) / submitted.length
                    : null;

                  const latestAttempt = cand.attempts[0];
                  const sc = latestAttempt ? statusConfig(latestAttempt.status) : null;

                  return (
                    <tr key={cand.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Candidate Name & Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 border border-indigo-100/50 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                            {initials || "?"}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[var(--foreground)] group-hover:text-indigo-650 transition-colors">
                              {cand.name}
                            </p>
                            <p className="text-[10px] text-[var(--foreground-subtle)] font-medium mt-0.5">
                              Joined {new Date(cand.registeredAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* ID / Email */}
                      <td className="py-4 px-5">
                        <p className="font-mono font-bold text-xs text-indigo-500">{cand.studentId}</p>
                        <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{cand.email}</p>
                      </td>

                      {/* Stream & Grade */}
                      <td className="py-4 px-5">
                        {cand.grade && cand.grade !== "N/A" ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-[var(--foreground)]">Grade {cand.grade}</span>
                            <span className="text-[10px] text-[var(--foreground-muted)]">{cand.stream || "General"}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--foreground-muted)]">—</span>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="py-4 px-5 text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-50 border border-slate-200/50 rounded-lg text-xs font-bold text-[var(--foreground-muted)]">
                          {cand.attempts.length}
                        </span>
                      </td>

                      {/* Average Score */}
                      <td className="py-4 px-5 text-center">
                        {averageScore !== null ? (
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-extrabold ${averageScore >= 75 ? "text-emerald-600" : averageScore < 45 ? "text-red-500" : "text-amber-600"}`}>
                              {averageScore.toFixed(1)}%
                            </span>
                            {averageScore >= 75 ? (
                              <span className="flex items-center text-[9px] text-emerald-500 font-bold gap-0.5">
                                <TrendingUp className="w-2.5 h-2.5" /> Elite
                              </span>
                            ) : averageScore < 45 ? (
                              <span className="flex items-center text-[9px] text-red-400 font-bold gap-0.5">
                                <TrendingDown className="w-2.5 h-2.5" /> Remedial
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--foreground-subtle)]">N/A</span>
                        )}
                      </td>

                      {/* Latest Status */}
                      <td className="py-4 px-5">
                        {sc ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">No Exams</span>
                        )}
                      </td>

                      {/* View Button */}
                      <td className="py-4 px-5 text-right">
                        <Button
                          onClick={() => setSelectedCandidate(cand)}
                          className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[var(--foreground)] font-bold text-xs gap-1 transition-all"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Candidate Inspector Drawer (Overlay Modal) */}
      <AnimatePresence>
        {selectedCandidate && !inspectingAttempt && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              className="absolute inset-0 bg-black"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[var(--border)]"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-sm">
                    {selectedCandidate.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--foreground)] leading-tight">{selectedCandidate.name}</h3>
                    <p className="text-xs text-[var(--foreground-muted)]">{selectedCandidate.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCandidate(null)}
                  className="rounded-xl border border-slate-200 h-9 w-9 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Academic Profile details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Academic Profile</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grade / Exam Type</p>
                      <p className="font-bold text-sm mt-0.5 text-[var(--foreground)]">
                        {selectedCandidate.grade ? `Grade ${selectedCandidate.grade} (${selectedCandidate.examType || "N/A"})` : "Not Specified"}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stream</p>
                      <p className="font-bold text-sm mt-0.5 text-[var(--foreground)]">
                        {selectedCandidate.stream && selectedCandidate.stream !== "N/A" ? selectedCandidate.stream : "Not Specified"}
                      </p>
                    </div>
                  </div>

                  {selectedCandidate.subjects && selectedCandidate.subjects.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled Subjects</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedCandidate.subjects.map(s => (
                          <Badge key={s} className="bg-indigo-50 text-indigo-650 border border-indigo-100 font-semibold text-[10px] hover:bg-indigo-50">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Exam Attempt History */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Attempts History</h4>
                    <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                      {selectedCandidate.attempts.length} attempts
                    </Badge>
                  </div>

                  {selectedCandidate.attempts.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                      This student has not joined any exam sessions yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedCandidate.attempts.map((attempt) => {
                        const dateStr = attempt.submittedAt 
                          ? new Date(attempt.submittedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                          : attempt.startedAt 
                          ? new Date(attempt.startedAt).toLocaleDateString([], { month: "short", day: "numeric" })
                          : "Unknown";

                        const sc = statusConfig(attempt.status);

                        return (
                          <div
                            key={attempt.participantId}
                            className="p-4 bg-white border border-[var(--border)] rounded-xl shadow-sm hover:border-indigo-100 transition-all flex flex-col gap-3 justify-between"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm leading-tight text-[var(--foreground)]">{attempt.paperTitle}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className="bg-indigo-50 text-indigo-650 border border-indigo-100/50 font-mono font-bold tracking-wider text-[9px] hover:bg-indigo-50 px-1 py-0.5">
                                    {attempt.paperCode}
                                  </Badge>
                                  <span className="text-[10px] text-[var(--foreground-muted)] flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {dateStr}
                                  </span>
                                </div>
                              </div>
                              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold ${sc.color}`}>
                                <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
                                {sc.label}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Score Achieved</p>
                                <p className="font-extrabold text-sm text-indigo-500 mt-0.5">
                                  {attempt.score !== null ? `${attempt.score.toFixed(1)}` : "—"}
                                  <span className="text-slate-400 text-xs font-normal"> / {attempt.totalQuestions}</span>
                                </p>
                              </div>

                              {attempt.status === "SUBMITTED" && (
                                <Button
                                  onClick={() => handleInspectAttempt(attempt, selectedCandidate.id)}
                                  className="h-8 px-3 rounded-lg bg-indigo-550 hover:bg-indigo-600 text-white font-bold text-xs"
                                >
                                  Inspect Answers
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate Attempt Review Panel (Hosts inspecting specific candidate paper details) */}
      <AnimatePresence>
        {inspectingAttempt && selectedCandidate && (
          <div className="fixed inset-0 z-50 bg-[var(--background)] overflow-y-auto">
            {/* HUD / Header bar */}
            <div className="sticky top-0 bg-white border-b border-[var(--border)] z-10 px-6 py-4">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleCloseAttemptReview}
                  className="flex items-center gap-2 hover:bg-[var(--background-secondary)] rounded-xl border border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to {selectedCandidate.name} Profile
                </Button>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--foreground-muted)] font-semibold">INSPECTING ATTEMPT:</span>
                    <Badge className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 py-1 px-3 rounded-full text-xs font-bold">
                      {selectedCandidate.name}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 max-w-6xl mx-auto space-y-6">
              {loadingReview || !reviewData ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="text-[var(--foreground-muted)] font-medium">Retrieving exam question selections...</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* Left Column: Active Question Review */}
                  <div className="lg:col-span-2 space-y-6">
                    {reviewData.questions.length === 0 ? (
                      <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--foreground-muted)]">
                        No questions found for this exam paper.
                      </div>
                    ) : (
                      (() => {
                        const q = reviewData.questions[activeQuestionIndex];
                        const userSelections = reviewData.responses
                          .filter((r: any) => r.paperDetailId === q.id && r.selectedOption !== null)
                          .map((r: any) => r.selectedOption);

                        const correctSet = new Set<number>();
                        if (q.correctAnswer1 !== null) correctSet.add(q.correctAnswer1);
                        if (q.correctAnswer2 !== null) correctSet.add(q.correctAnswer2);

                        const isCorrect =
                          userSelections.length > 0 &&
                          userSelections.every((val: number) => correctSet.has(val)) &&
                          userSelections.length === correctSet.size;

                        const optionsList = [
                          { text: q.answer1, img: q.answer1Image, index: 1 },
                          { text: q.answer2, img: q.answer2Image, index: 2 },
                          { text: q.answer3, img: q.answer3Image, index: 3 },
                          { text: q.answer4, img: q.answer4Image, index: 4 },
                          { text: q.answer5, img: q.answer5Image, index: 5 }
                        ].filter(opt => opt.text || opt.img);

                        const responseRow = reviewData.responses.find(
                          (r: any) => r.paperDetailId === q.id
                        );
                        const timeSpentVal = responseRow ? responseRow.timeSpent : 0;

                        return (
                          <div className="space-y-6">
                            {/* Question Header Card */}
                            <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-indigo-500 uppercase tracking-wider">
                                  Question {q.questionNumber} of {reviewData.questions.length}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-xs text-[var(--foreground-subtle)] font-medium">
                                    <Clock className="w-3.5 h-3.5" />
                                    Time spent: {timeSpentVal}s
                                  </span>
                                  <Badge className={q.difficulty === "Easy" ? "bg-emerald-550/10 text-emerald-600 border-emerald-200" : q.difficulty === "Hard" ? "bg-red-500/10 text-red-500 border-red-200" : "bg-amber-500/10 text-amber-600 border-amber-200"}>
                                    {q.difficulty}
                                  </Badge>
                                </div>
                              </div>

                              <h2 className="text-lg font-bold text-[var(--foreground)] leading-relaxed">
                                {q.questionText}
                              </h2>

                              {q.questionImage && (
                                <div className="rounded-xl overflow-hidden border border-[var(--border)] max-w-lg mx-auto">
                                  <img
                                    src={q.questionImage}
                                    alt={`Question ${q.questionNumber}`}
                                    className="object-contain w-full h-auto max-h-[300px]"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Options Grid */}
                            <div className="space-y-3">
                              {optionsList.map((opt) => {
                                const isUserSelected = userSelections.includes(opt.index);
                                const isCorrectOpt = correctSet.has(opt.index);

                                let borderClass = "border-[var(--border)] bg-[var(--background-card)]";
                                let badgeElement = null;

                                if (isUserSelected && isCorrectOpt) {
                                  borderClass = "border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/5";
                                  badgeElement = (
                                    <Badge className="bg-emerald-500 text-white border-none text-[10px] uppercase font-extrabold tracking-wider">
                                      Correctly Chosen
                                    </Badge>
                                  );
                                } else if (isUserSelected && !isCorrectOpt) {
                                  borderClass = "border-red-500 bg-red-500/5";
                                  badgeElement = (
                                    <Badge className="bg-red-500 text-white border-none text-[10px] uppercase font-extrabold tracking-wider">
                                      Candidate Selection
                                    </Badge>
                                  );
                                } else if (isCorrectOpt) {
                                  borderClass = "border-emerald-500/70 bg-emerald-500/5";
                                  badgeElement = (
                                    <Badge className="bg-emerald-500/20 text-emerald-600 border border-emerald-200 text-[10px] uppercase font-extrabold tracking-wider">
                                      Correct Answer
                                    </Badge>
                                  );
                                }

                                return (
                                  <div
                                    key={opt.index}
                                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${borderClass}`}
                                  >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                      isCorrectOpt
                                        ? "bg-emerald-50 text-white"
                                        : isUserSelected
                                        ? "bg-red-500 text-white"
                                        : "bg-[var(--background-secondary)] text-[var(--foreground-muted)]"
                                    }`}>
                                      {String.fromCharCode(64 + opt.index)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <p className="text-sm font-medium text-[var(--foreground)] pt-0.5">
                                        {opt.text}
                                      </p>
                                      {opt.img && (
                                        <div className="rounded-lg overflow-hidden border border-[var(--border)] max-w-sm mt-2">
                                          <img
                                            src={opt.img}
                                            alt={`Option ${opt.index}`}
                                            className="object-contain max-h-[150px]"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    {badgeElement}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Summary alert */}
                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                              isCorrect
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                                : "bg-red-500/10 border-red-500/20 text-red-700"
                            }`}>
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-bold text-emerald-650">Correctly Answered</p>
                                    <p className="text-xs text-emerald-500 mt-0.5">
                                      The candidate answered this question correctly.
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-bold text-red-650">Incorrectly Answered / Skipped</p>
                                    <p className="text-xs text-red-500 mt-0.5">
                                      {userSelections.length === 0
                                        ? "The candidate skipped this question."
                                        : `Candidate selected: ${userSelections.map((i: number) => String.fromCharCode(64 + i)).join(", ")}. Correct answer(s): ${Array.from(correctSet).map(i => String.fromCharCode(64 + i)).join(", ")}.`}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Right Column: Stats & Navigation */}
                  <div className="space-y-6">
                    {/* Score Card */}
                    <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--foreground)]">Attempt Score</h3>
                          <p className="text-xs text-[var(--foreground-muted)]">Exam details</p>
                        </div>
                      </div>

                      <div className="border-t border-[var(--border)] pt-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--foreground-muted)]">Exam Title:</span>
                          <span className="font-bold text-[var(--foreground)] text-right">
                            {reviewData.paper.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--foreground-muted)]">Code:</span>
                          <span className="font-mono font-bold text-indigo-500">
                            {reviewData.paper.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--foreground-muted)]">Score:</span>
                          <span className="font-black text-indigo-500 text-lg">
                            {reviewData.participant?.score !== null
                              ? `${reviewData.participant?.score.toFixed(1)} / ${(
                                  reviewData.paper.totalMarks || reviewData.questions.length
                                ).toFixed(1)}`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Question Navigator */}
                    <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">Questions</h3>
                      <div className="grid grid-cols-5 gap-2">
                        {reviewData.questions.map((q: any, idx: number) => {
                          const userSelections = reviewData.responses
                            .filter((r: any) => r.paperDetailId === q.id && r.selectedOption !== null)
                            .map((r: any) => r.selectedOption);

                          const correctSet = new Set<number>();
                          if (q.correctAnswer1 !== null) correctSet.add(q.correctAnswer1);
                          if (q.correctAnswer2 !== null) correctSet.add(q.correctAnswer2);

                          const isCorrect =
                            userSelections.length > 0 &&
                            userSelections.every((val: number) => correctSet.has(val)) &&
                            userSelections.length === correctSet.size;

                          const isActive = idx === activeQuestionIndex;

                          let bgClass = "bg-[var(--background-secondary)] text-[var(--foreground-muted)] border-[var(--border)]";
                          if (userSelections.length === 0) {
                            bgClass = "bg-amber-500/10 text-amber-600 border-amber-200/50";
                          } else if (isCorrect) {
                            bgClass = "bg-emerald-500 text-white border-emerald-600";
                          } else {
                            bgClass = "bg-red-500 text-white border-red-600";
                          }

                          return (
                            <button
                              key={q.id}
                              onClick={() => setActiveQuestionIndex(idx)}
                              className={`h-9 w-9 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${bgClass} ${
                                isActive ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : "hover:opacity-85"
                              }`}
                            >
                              {q.questionNumber}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-[var(--border)] flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--foreground-subtle)] justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Correct
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-red-500" /> Incorrect
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-200" /> Skipped
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
