"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Award,
  Clock,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  History,
  Check,
  FileText
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCandidateExamReview,
  getCandidateExams,
  checkIfGuest
} from "@/app/actions/candidate";

function SubmittedScreenContent() {
  const searchParams = useSearchParams();
  const fullName = searchParams.get("fullName") || "";
  const userId = searchParams.get("userId") || "";
  const paperIdParam = searchParams.get("paperId") || "";
  const examCodeParam = searchParams.get("examCode") || "";

  const [isGuest, setIsGuest] = useState(false);
  const [loadingReview, setLoadingReview] = useState(true);
  const [reviewData, setReviewData] = useState<any>(null);
  const [filterType, setFilterType] = useState<"all" | "correct" | "incorrect" | "skipped">("all");
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Check guest status
  useEffect(() => {
    if (userId) {
      checkIfGuest(userId).then((res) => {
        if (res.success && res.isGuest) {
          setIsGuest(true);
        }
      });
    }
  }, [userId]);

  // Load results and question review
  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      setLoadingReview(true);
      try {
        let targetPaperId = paperIdParam;

        // If paperId was not passed in URL, attempt to find latest attempt for user
        if (!targetPaperId && userId) {
          const examsRes = await getCandidateExams(userId);
          if (examsRes.success && examsRes.data && examsRes.data.length > 0) {
            targetPaperId = examsRes.data[0].session?.paper?.id || "";
          }
        }

        if (targetPaperId && userId) {
          const revRes = await getCandidateExamReview(targetPaperId, userId);
          if (isMounted && revRes.success && revRes.data) {
            setReviewData(revRes.data);
          }
        }
      } catch (err) {
        console.error("Failed to load review data:", err);
      } finally {
        if (isMounted) setLoadingReview(false);
      }
    }

    loadResults();

    return () => {
      isMounted = false;
    };
  }, [paperIdParam, userId]);

  const now = new Date();
  const submissionTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const submissionDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const questions: any[] = reviewData?.questions || [];
  const responses: any[] = reviewData?.responses || [];
  const stats = reviewData?.stats;

  // Filter questions based on filterType
  const filteredQuestions = questions.filter((q) => {
    const qResponses = responses.filter((r) => r.paperDetailId === q.id && r.selectedOption !== null);
    const correctSet = new Set<number>();
    if (q.correctAnswer1 !== null) correctSet.add(q.correctAnswer1);
    if (q.correctAnswer2 !== null) correctSet.add(q.correctAnswer2);

    const userOpts = qResponses.map((r) => r.selectedOption as number);
    const isAnswered = userOpts.length > 0;
    const isCorrect = isAnswered &&
      userOpts.every((opt) => correctSet.has(opt)) &&
      userOpts.length === correctSet.size;

    if (filterType === "correct") return isCorrect;
    if (filterType === "incorrect") return isAnswered && !isCorrect;
    if (filterType === "skipped") return !isAnswered;
    return true;
  });

  // Safe active question
  const currentQuestion = filteredQuestions[activeQuestionIdx] || filteredQuestions[0] || questions[0];

  return (
    <div className="min-h-screen bg-[var(--background)] relative py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* Celebratory ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-600/5 blur-[160px] rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-10 right-1/4 w-[500px] h-[300px] bg-indigo-600/5 blur-[140px] rounded-full"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8 animate-fade-in">

        {/* ── 1. Success Hero Banner ── */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-emerald-500/20 w-24 h-24"
              />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.2} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
              Exam Submitted Successfully!
            </h1>
            <p className="text-sm sm:text-base text-[var(--foreground-muted)] max-w-md mx-auto">
              Your responses have been recorded and marked. You can review your score and question answers below.
            </p>
          </motion.div>

          {/* Metadata pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="inline-flex items-center flex-wrap justify-center gap-3 py-2 px-4 rounded-full bg-[var(--background-card)] border border-[var(--border)] text-xs text-[var(--foreground-subtle)] shadow-sm"
          >
            {fullName && (
              <span className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {fullName}
              </span>
            )}
            {reviewData?.paper?.title && (
              <>
                <span>•</span>
                <span className="font-bold text-[var(--foreground)]">{reviewData.paper.title}</span>
              </>
            )}
            {(examCodeParam || reviewData?.paper?.code) && (
              <>
                <span>•</span>
                <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-200/50 font-mono text-[10px] py-0">
                  {reviewData?.paper?.code || examCodeParam}
                </Badge>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1 text-[var(--foreground-subtle)]">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              {submissionDate} at {submissionTime}
            </span>
          </motion.div>
        </div>

        {/* ── 2. Performance Scorecard & Stats ── */}
        {loadingReview ? (
          <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-[var(--foreground-muted)]">
              Calculating your exam results & answers...
            </p>
          </div>
        ) : stats ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {/* Final Score */}
            <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
              <div className="h-1 bg-indigo-500 absolute top-0 inset-x-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[var(--foreground-subtle)]">
                  Your Score
                </span>
                <Award className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600">
                {stats.score.toFixed(1)}
                <span className="text-xs font-semibold text-[var(--foreground-subtle)] ml-1">
                  / {stats.totalMarks}
                </span>
              </p>
              <p className="text-[11px] font-medium text-[var(--foreground-muted)]">
                Accuracy: {stats.accuracy}%
              </p>
            </div>

            {/* Correct Answers */}
            <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
              <div className="h-1 bg-emerald-500 absolute top-0 inset-x-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[var(--foreground-subtle)]">
                  Correct
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                {stats.correctCount}
                <span className="text-xs font-semibold text-[var(--foreground-subtle)] ml-1">
                  / {stats.totalQuestions}
                </span>
              </p>
              <p className="text-[11px] font-medium text-emerald-600/80">
                Correctly answered
              </p>
            </div>

            {/* Incorrect Answers */}
            <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
              <div className="h-1 bg-red-500 absolute top-0 inset-x-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[var(--foreground-subtle)]">
                  Incorrect
                </span>
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-red-500">
                {stats.incorrectCount}
              </p>
              <p className="text-[11px] font-medium text-red-500/80">
                Wrong option picked
              </p>
            </div>

            {/* Skipped */}
            <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-1 relative overflow-hidden">
              <div className="h-1 bg-amber-500 absolute top-0 inset-x-0" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[var(--foreground-subtle)]">
                  Skipped
                </span>
                <HelpCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-500">
                {stats.skippedCount}
              </p>
              <p className="text-[11px] font-medium text-amber-600/80">
                Unanswered questions
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* ── 3. Action Links Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--background-card)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">Track All Exam Attempts</p>
              <p className="text-xs text-[var(--foreground-muted)]">
                View your complete test history, past scores, and question review archive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/host/candidates"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
            >
              <History className="w-4 h-4" />
              My Exam History
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>

        {/* Guest Account Promotion if needed */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-500/5 via-white to-violet-500/5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <h3 className="font-bold text-slate-900 text-sm">Save This Attempt to a Permanent Student Account</h3>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                You attended this exam as a guest. Create a free account now to link your results, view historical rankings, and review all answers whenever you want.
              </p>
            </div>

            <Link
              href={`/auth/sign-up?guestUserId=${userId}`}
              className="flex items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
            >
              Save Results & Sign Up
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        )}

        {/* ── 4. Detailed Question-by-Question Answers Review ── */}
        {questions.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Detailed Answers & Question Review
                </h2>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Inspect the correct options and check your selected choices for each question.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] text-xs">
                <button
                  onClick={() => { setFilterType("all"); setActiveQuestionIdx(0); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterType === "all" ? "bg-[var(--background-card)] text-indigo-600 shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
                >
                  All ({questions.length})
                </button>
                <button
                  onClick={() => { setFilterType("correct"); setActiveQuestionIdx(0); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterType === "correct" ? "bg-emerald-500 text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-emerald-600"}`}
                >
                  Correct ({stats?.correctCount ?? 0})
                </button>
                <button
                  onClick={() => { setFilterType("incorrect"); setActiveQuestionIdx(0); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterType === "incorrect" ? "bg-red-500 text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-red-500"}`}
                >
                  Incorrect ({stats?.incorrectCount ?? 0})
                </button>
                <button
                  onClick={() => { setFilterType("skipped"); setActiveQuestionIdx(0); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterType === "skipped" ? "bg-amber-500 text-white shadow-sm" : "text-[var(--foreground-muted)] hover:text-amber-600"}`}
                >
                  Skipped ({stats?.skippedCount ?? 0})
                </button>
              </div>
            </div>

            {/* Review Layout: Active Question Card + Grid Selector */}
            {filteredQuestions.length === 0 ? (
              <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-10 text-center text-sm text-[var(--foreground-muted)]">
                No questions match this filter.
              </div>
            ) : currentQuestion ? (
              (() => {
                const q = currentQuestion;
                const userSelections = responses
                  .filter((r) => r.paperDetailId === q.id && r.selectedOption !== null)
                  .map((r) => r.selectedOption as number);

                const correctSet = new Set<number>();
                if (q.correctAnswer1 !== null) correctSet.add(q.correctAnswer1);
                if (q.correctAnswer2 !== null) correctSet.add(q.correctAnswer2);

                const isAnswered = userSelections.length > 0;
                const isCorrect = isAnswered &&
                  userSelections.every((val) => correctSet.has(val)) &&
                  userSelections.length === correctSet.size;

                const optionsList = [
                  { text: q.answer1, img: q.answer1Image, index: 1 },
                  { text: q.answer2, img: q.answer2Image, index: 2 },
                  { text: q.answer3, img: q.answer3Image, index: 3 },
                  { text: q.answer4, img: q.answer4Image, index: 4 },
                  { text: q.answer5, img: q.answer5Image, index: 5 }
                ].filter((opt) => opt.text || opt.img);

                const responseRow = responses.find((r) => r.paperDetailId === q.id);
                const timeSpentVal = responseRow?.timeSpent || 0;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Main Question Display */}
                    <div className="lg:col-span-8 space-y-4">
                      <div className="bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-extrabold text-indigo-500 uppercase tracking-wider">
                            Question {q.questionNumber} of {questions.length}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-[var(--foreground-subtle)] font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {timeSpentVal}s spent
                            </span>
                            <Badge className={q.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : q.difficulty === "Hard" ? "bg-red-500/10 text-red-500 border-red-200" : "bg-amber-500/10 text-amber-600 border-amber-200"}>
                              {q.difficulty}
                            </Badge>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-relaxed">
                          {q.questionText}
                        </h3>

                        {q.questionImage && (
                          <div className="rounded-xl overflow-hidden border border-[var(--border)] max-w-lg mx-auto bg-black/5">
                            <img
                              src={q.questionImage}
                              alt={`Question ${q.questionNumber}`}
                              className="object-contain w-full h-auto max-h-[300px]"
                            />
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        {optionsList.map((opt) => {
                          const isUserSelected = userSelections.includes(opt.index);
                          const isCorrectOpt = correctSet.has(opt.index);

                          let borderClass = "border-[var(--border)] bg-[var(--background-card)]";
                          let badgeElement = null;

                          if (isUserSelected && isCorrectOpt) {
                            borderClass = "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/5";
                            badgeElement = (
                              <Badge className="bg-emerald-500 text-white border-none text-[10px] uppercase font-black tracking-wider">
                                Your Correct Answer
                              </Badge>
                            );
                          } else if (isUserSelected && !isCorrectOpt) {
                            borderClass = "border-red-500 bg-red-500/10";
                            badgeElement = (
                              <Badge className="bg-red-500 text-white border-none text-[10px] uppercase font-black tracking-wider">
                                Your Answer (Incorrect)
                              </Badge>
                            );
                          } else if (isCorrectOpt) {
                            borderClass = "border-emerald-500/60 bg-emerald-500/5";
                            badgeElement = (
                              <Badge className="bg-emerald-500/20 text-emerald-600 border border-emerald-300 text-[10px] uppercase font-black tracking-wider">
                                Correct Answer
                              </Badge>
                            );
                          }

                          return (
                            <div
                              key={opt.index}
                              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${borderClass}`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isCorrectOpt
                                    ? "bg-emerald-500 text-white"
                                    : isUserSelected
                                    ? "bg-red-500 text-white"
                                    : "bg-[var(--background-secondary)] text-[var(--foreground-muted)]"
                                }`}
                              >
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

                      {/* Question Answer Summary Banner */}
                      <div
                        className={`p-4 rounded-xl border flex items-start gap-3 ${
                          isCorrect
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                            : !isAnswered
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-700"
                            : "bg-red-500/10 border-red-500/20 text-red-700"
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-emerald-600">Correctly Answered</p>
                              <p className="text-xs text-emerald-600/90 mt-0.5">
                                Great job! You selected the correct option(s) for this question.
                              </p>
                            </div>
                          </>
                        ) : !isAnswered ? (
                          <>
                            <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-amber-600">Question Skipped</p>
                              <p className="text-xs text-amber-600/90 mt-0.5">
                                You did not select an answer. The correct option(s) is/are:{" "}
                                {Array.from(correctSet).map((i) => String.fromCharCode(64 + i)).join(", ")}.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-red-500">Incorrect Choice</p>
                              <p className="text-xs text-red-500/90 mt-0.5">
                                You selected: {userSelections.map((i) => String.fromCharCode(64 + i)).join(", ")}.
                                The correct option(s) is/are: {Array.from(correctSet).map((i) => String.fromCharCode(64 + i)).join(", ")}.
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Previous / Next buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activeQuestionIdx === 0}
                          onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                          className="flex items-center gap-1.5 rounded-xl text-xs font-bold"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous Question
                        </Button>
                        <span className="text-xs text-[var(--foreground-subtle)] font-medium">
                          {activeQuestionIdx + 1} of {filteredQuestions.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activeQuestionIdx === filteredQuestions.length - 1}
                          onClick={() => setActiveQuestionIdx((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                          className="flex items-center gap-1.5 rounded-xl text-xs font-bold"
                        >
                          Next Question
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Question Grid Navigator */}
                    <div className="lg:col-span-4 bg-[var(--background-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider">
                          Questions Navigator
                        </h4>
                        <span className="text-xs font-bold text-indigo-500">
                          {filteredQuestions.length} questions
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {filteredQuestions.map((item, idx) => {
                          const itemSelections = responses
                            .filter((r) => r.paperDetailId === item.id && r.selectedOption !== null)
                            .map((r) => r.selectedOption as number);

                          const itemCorrectSet = new Set<number>();
                          if (item.correctAnswer1 !== null) itemCorrectSet.add(item.correctAnswer1);
                          if (item.correctAnswer2 !== null) itemCorrectSet.add(item.correctAnswer2);

                          const itemAnswered = itemSelections.length > 0;
                          const itemCorrect = itemAnswered &&
                            itemSelections.every((val) => itemCorrectSet.has(val)) &&
                            itemSelections.length === itemCorrectSet.size;

                          const isCurrent = idx === activeQuestionIdx;

                          let btnStyle = "bg-[var(--background-secondary)] text-[var(--foreground-muted)] border-[var(--border)]";
                          if (!itemAnswered) {
                            btnStyle = "bg-amber-500/10 text-amber-600 border-amber-200";
                          } else if (itemCorrect) {
                            btnStyle = "bg-emerald-500 text-white border-emerald-600";
                          } else {
                            btnStyle = "bg-red-500 text-white border-red-600";
                          }

                          return (
                            <button
                              key={item.id}
                              onClick={() => setActiveQuestionIdx(idx)}
                              className={`h-9 w-9 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${btnStyle} ${
                                isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : "hover:opacity-85"
                              }`}
                            >
                              {item.questionNumber}
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
                );
              })()
            ) : null}
          </div>
        )}

        {/* ── 5. Bottom Navigation / Home Link ── */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-[var(--foreground-subtle)]">
            Teso Exams Platform • All exam attempts are permanently saved to your profile
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/host/candidates"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Open My Exam History
            </Link>
            <span className="text-[var(--border)]">•</span>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Return to Home
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SubmittedScreenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      }
    >
      <SubmittedScreenContent />
    </Suspense>
  );
}
