"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Clock,
  Loader2,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Award,
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getCandidateExams,
  getCandidateExamReview
} from "@/app/actions/candidate";

function CandidateDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlReviewPaperId = searchParams.get("reviewPaperId");

  // State
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Review state
  const [reviewPaperId, setReviewPaperId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Load candidate exams
  const loadExams = async (userId: string) => {
    setLoadingExams(true);
    const res = await getCandidateExams(userId);
    if (res.success && res.data) {
      setExams(res.data);
    } else {
      toast.error(res.error || "Failed to load exam history.");
    }
    setLoadingExams(false);
  };

  const userId = user?.id;
  useEffect(() => {
    if (!authLoading && userId) {
      loadExams(userId);
    }
  }, [userId, authLoading]);

  // Support direct review opening via query parameter
  useEffect(() => {
    if (urlReviewPaperId && user?.id && !reviewPaperId) {
      handleOpenReview(urlReviewPaperId);
    }
  }, [urlReviewPaperId, user?.id]);

  // Handle join exam code submit
  const handleJoinExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter a valid exam code.");
      return;
    }
    setJoining(true);
    router.push(`/candidate/identity?examCode=${encodeURIComponent(joinCode.toUpperCase())}`);
  };

  // Open review details
  const handleOpenReview = async (paperId: string) => {
    if (!user) return;
    setReviewPaperId(paperId);
    setLoadingReview(true);
    setActiveQuestionIndex(0);

    const res = await getCandidateExamReview(paperId, user.id);
    if (res.success && res.data) {
      setReviewData(res.data);
    } else {
      toast.error(res.error || "Failed to load review details.");
      setReviewPaperId(null);
    }
    setLoadingReview(false);
  };

  // Close review
  const handleCloseReview = () => {
    setReviewPaperId(null);
    setReviewData(null);
  };

  // Filter exams by query
  const filteredExams = exams.filter((item) => {
    const title = item.session?.paper?.title || "";
    const code = item.session?.paper?.code || "";
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (authLoading || (loadingExams && !reviewPaperId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-[var(--foreground-muted)] font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  // Render Exam Review Panel
  if (reviewPaperId) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <Button
            variant="ghost"
            onClick={handleCloseReview}
            className="flex items-center gap-2 hover:bg-[var(--background-secondary)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 py-1 px-3 rounded-full text-xs font-semibold">
              Exam Review Mode
            </Badge>
          </div>
        </div>

        {loadingReview || !reviewData ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-[var(--foreground-muted)] font-medium">Loading review answers...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left/Main Column: Active Question Review */}
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
                                Your Correct Answer
                              </Badge>
                            );
                          } else if (isUserSelected && !isCorrectOpt) {
                            borderClass = "border-red-500 bg-red-500/5";
                            badgeElement = (
                              <Badge className="bg-red-500 text-white border-none text-[10px] uppercase font-extrabold tracking-wider">
                                Your Answer
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
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCorrectOpt
                                ? "bg-emerald-500 text-white"
                                : isUserSelected
                                  ? "bg-red-555 text-red-500 border border-red-200"
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

                      {/* Question Answer Summary Alert */}
                      <div className={`p-4 rounded-xl border flex items-start gap-3 ${isCorrect
                        ? "bg-emerald-500/10 border-emerald-555/20 text-emerald-700"
                        : "bg-red-500/10 border-red-500/20 text-red-700"
                        }`}>
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-emerald-600">Correctly Answered</p>
                              <p className="text-xs text-emerald-500 mt-0.5">
                                You selected the correct option(s) for this question. Good job!
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-red-550">Incorrectly Answered</p>
                              <p className="text-xs text-red-500 mt-0.5">
                                {userSelections.length === 0
                                  ? "You skipped this question."
                                  : `You selected option(s): ${userSelections.map((i: number) => String.fromCharCode(64 + i)).join(", ")}. The correct option(s) is/are: ${Array.from(correctSet).map(i => String.fromCharCode(64 + i)).join(", ")}.`}
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

            {/* Right Column: Question Nav and Stats */}
            <div className="space-y-6">
              {/* Paper Score Summary */}
              <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">Performance Score</h3>
                    <p className="text-xs text-[var(--foreground-muted)]">Exam overall stats</p>
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
                    <span className="text-[var(--foreground-muted)]">Exam Code:</span>
                    <span className="font-mono font-bold text-indigo-500">
                      {reviewData.paper.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-muted)]">Your Score:</span>
                    <span className="font-bold text-indigo-500 text-lg">
                      {reviewData.participant?.score !== null
                        ? `${reviewData.participant?.score.toFixed(1)} / ${(
                          reviewData.paper.totalMarks || reviewData.questions.length
                        ).toFixed(1)}`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Grid */}
              <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[var(--foreground)]">Questions Navigation</h3>
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
                        className={`h-9 w-9 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${bgClass} ${isActive ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : "hover:opacity-85"
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
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Main Layout grid: Join Exam & History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Columns: My Exam History & Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              My Exams & History
            </h2>
            <div className="relative w-full sm:w-64">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)]">
                <Search className="w-4 h-4" />
              </div>
              <Input
                type="text"
                placeholder="Search by title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-[var(--background-card)] border-[var(--border)] text-sm rounded-xl focus:border-indigo-400 focus:ring-indigo-400/15"
              />
            </div>
          </div>

          {/* Quick Summary Stats */}
          {exams.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-subtle)]">Total Attempts</span>
                <p className="text-xl font-black text-indigo-500">{exams.length}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-subtle)]">Completed</span>
                <p className="text-xl font-black text-emerald-500">
                  {exams.filter((e) => e.status === "SUBMITTED" || e.score !== null).length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--background-card)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-subtle)]">Average Score</span>
                <p className="text-xl font-black text-indigo-500">
                  {(() => {
                    const scored = exams.filter((e) => e.score !== null && e.score !== undefined);
                    if (scored.length === 0) return "—";
                    const avg = scored.reduce((acc, curr) => acc + curr.score, 0) / scored.length;
                    return `${avg.toFixed(1)}%`;
                  })()}
                </p>
              </div>
            </div>
          )}

          {filteredExams.length === 0 ? (
            <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[var(--foreground)]">No exams found</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {searchQuery ? "No results match your search filters." : "You haven't attended any exams yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredExams.map((item) => {
                const paper = item.session?.paper;
                const date = paper?.examDate ? new Date(paper.examDate) : null;
                const formattedDate = date
                  ? date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                  : "N/A";

                const isSubmitted = item.status === "SUBMITTED" || item.score !== null;
                const isLobby = ["WAITING", "ADMITTED", "IN_EXAM"].includes(item.status);

                return (
                  <motion.div
                    key={item.id}
                    layoutId={item.id}
                    className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10 border-indigo-200/50 font-mono font-bold tracking-wider text-[10px]">
                          {paper?.code}
                        </Badge>
                        <Badge
                          className={
                            item.status === "SUBMITTED"
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-200/50"
                              : item.status === "WAITING"
                                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-amber-200/50 animate-pulse"
                                : "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10 border-indigo-200/50"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-[var(--foreground)] text-base tracking-tight leading-tight">
                        {paper?.title || "Exam Paper"}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-[var(--foreground-subtle)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formattedDate}
                        </span>
                        <span>•</span>
                        <span>{item.totalQuestions} Questions</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border)]">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--foreground-subtle)]">
                          Score
                        </p>
                        <p className="font-black text-indigo-500 text-lg">
                          {item.score !== null ? `${item.score.toFixed(1)}` : "—"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSubmitted ? (
                          <Button
                            onClick={() => paper?.id && handleOpenReview(paper.id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs h-9 px-4 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                            Review & Answers
                          </Button>
                        ) : isLobby ? (
                          <Button
                            onClick={() => {
                              const params = new URLSearchParams({
                                fullName: item.fullName,
                                classCode: item.classCode,
                                examCode: paper.code,
                                userId: user?.id || "",
                                participantId: item.id
                              });
                              router.push(`/candidate/waiting?${params.toString()}`);
                            }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs h-9 px-4 cursor-pointer shadow-md shadow-indigo-500/20"
                          >
                            Resume Lobby
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border border-red-200">
                            Closed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        {/* Guidv>
        {/* Right Column: Join Exam Form */}
        <div className="space-y-6">
          {/* Guidelines / Help info card */}
          <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  Exam Guidelines
                </h4>
                <ul className="text-xs text-[var(--foreground-muted)] list-disc pl-4 space-y-2 pt-1.5 leading-relaxed">
                  <li>Keep your browser window open until submission completes.</li>
                  <li>Leaving the window does not pause the exam clock.</li>
                  <li>Answers are saved automatically as you check them.</li>
                  <li>Review Mode is available immediately after submission.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm relative">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 w-full" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-[var(--foreground)] text-sm uppercase tracking-wider">
                  Join Exam
                </h3>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                Have an invitation code? Enter the exam code below to join the waitroom lobby.
              </p>

              <form onSubmit={handleJoinExam} className="space-y-4 pt-2">
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    placeholder="ENTER EXAM CODE"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={20}
                    className="w-full text-center font-mono font-bold text-lg tracking-wider uppercase h-14 bg-[var(--background-secondary)] border-[var(--border)] focus:border-indigo-400 focus:ring-indigo-400/15 rounded-xl placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-[var(--foreground-subtle)]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Proceed to Exam Check-In
                      <ChevronRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-[var(--foreground-muted)] font-medium">Loading Dashboard...</p>
        </div>
      }
    >
      <CandidateDashboardContent />
    </Suspense>
  );
}
