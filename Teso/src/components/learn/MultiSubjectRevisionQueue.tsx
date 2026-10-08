"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  Flame,
  Layers,
  ChevronRight,
  TrendingDown,
  Loader2,
  HelpCircle,
  Award,
  X,
  Check,
  XCircle,
  ArrowRight,
  History,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getEnrolledSubjects,
  getMultiSubjectRevisionQueue,
  startRevisionQuiz,
  submitSingleQuestionAnswer,
  getRevisionHistory,
} from "@/app/actions/revision-actions";

export function MultiSubjectRevisionQueue() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Quiz Modal State (One-by-One Adaptive Runner)
  const [isQuizOpen, setIsQuizOpen] = useState<boolean>(false);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);

  // Single Question Interactive State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);

  // Session Cumulative Progress
  const [sessionCorrectCount, setSessionCorrectCount] = useState<number>(0);
  const [sessionTotalXP, setSessionTotalXP] = useState<number>(0);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);

  // Question Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(90);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Enrolled Subjects
  useEffect(() => {
    async function loadSubjects() {
      try {
        const subs = await getEnrolledSubjects();
        setSubjects(subs);
      } catch (err) {
        console.error("Failed to load enrolled subjects", err);
      }
    }
    loadSubjects();
  }, []);

  // Load Revision Queue
  const fetchQueue = async (subjectId?: string) => {
    setLoading(true);
    try {
      const res = await getMultiSubjectRevisionQueue(subjectId || undefined, 20);
      setQueueItems(res.items || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load revision queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(selectedSubjectId);
  }, [selectedSubjectId]);

  // Start Adaptive Quiz - Navigates directly to dedicated /revison/[id] page
  const handleStartQuiz = (subtopicId?: string) => {
    const targetId = subtopicId || "all";
    const query = selectedSubjectId ? `?subject_id=${selectedSubjectId}` : "";
    router.push(`/revison/${targetId}${query}`);
  };

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await getRevisionHistory(30);
      setHistoryItems(data || []);
    } catch (err: any) {
      console.error("Error fetching revision history:", err);
      toast.error("Failed to load revision history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isQuizOpen || !activeQuiz || isSessionComplete || isAnswerSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isQuizOpen, currentQIndex, isSessionComplete, isAnswerSubmitted]);

  const currentQuestion = activeQuiz?.questions?.[currentQIndex];

  // Submit Current Single Question
  const handleSubmitCurrentAnswer = async () => {
    if (!activeQuiz || !currentQuestion || selectedOption === null) {
      toast.error("Please select an answer choice first.");
      return;
    }

    setSubmittingAnswer(true);
    const elapsedMs = Date.now() - startTimeRef.current;

    try {
      const feedback = await submitSingleQuestionAnswer(
        activeQuiz.session_id,
        currentQuestion.id,
        selectedOption,
        elapsedMs
      );

      setCurrentFeedback(feedback);
      setIsAnswerSubmitted(true);
      if (feedback.is_correct) {
        setSessionCorrectCount((prev) => prev + 1);
      }
      setSessionTotalXP((prev) => prev + (feedback.earned_xp || 10));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Move to Next Question
  const handleNextQuestion = () => {
    if (!activeQuiz) return;

    if (currentQIndex < activeQuiz.questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setCurrentFeedback(null);
      setTimeRemaining(activeQuiz.questions[nextIdx]?.time_limit_seconds || 90);
      startTimeRef.current = Date.now();
    } else {
      // Completed Session
      setIsSessionComplete(true);
      fetchQueue(selectedSubjectId);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <RotateCw className="w-8 h-8 text-primary animate-spin-slow" />
            Spaced Repetition Revision
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Questions follow syllabus lesson & subtopic sequence with immediate results and Duolingo dynamic calibration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenHistory}
            className="inline-flex items-center gap-2 bg-card border border-border/80 hover:bg-muted text-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm active:scale-95"
          >
            <History className="w-4 h-4 text-primary" />
            See History
          </button>
          <button
            onClick={() => handleStartQuiz()}
            disabled={queueItems.length === 0}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Start Sequential Revision Quiz
          </button>
        </div>
      </div>

      {/* Enrolled Subjects Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/20">
        <button
          onClick={() => setSelectedSubjectId("")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedSubjectId === "" ? "bg-primary text-primary-foreground shadow" : "bg-card border border-border/60 text-muted-foreground hover:bg-muted"}`}
        >
          All Enrolled Subjects Pool
        </button>
        {subjects.map((s) => (
          <button
            key={s.subject_id}
            onClick={() => setSelectedSubjectId(s.subject_id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedSubjectId === s.subject_id ? "bg-primary text-primary-foreground shadow" : "bg-card border border-border/60 text-muted-foreground hover:bg-muted"}`}
          >
            {s.subject_name} ({s.exam_level})
          </button>
        ))}
      </div>

      {/* Queue Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm">Calculating syllabus sequence and Ebbinghaus forgetting risk...</p>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center text-muted-foreground space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
          <h3 className="text-lg font-semibold text-foreground">You are all caught up!</h3>
          <p className="text-xs max-w-md mx-auto">
            No subtopics are currently overdue for review in this subject. Your memory retention is holding strong.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queueItems.map((item) => (
            <div
              key={item.subtopic_id}
              className={`bg-card border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md ${item.is_overdue ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border/60"}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                    {item.subject_name}
                  </span>
                  {item.is_overdue ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due in {item.current_interval_days}d
                    </span>
                  )}
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    Syllabus Code {item.subtopic_code}
                  </div>
                  <h4 className="text-base font-bold text-foreground line-clamp-1">{item.subtopic_name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.topic_name}</p>
                </div>

                {/* Forgetting Risk Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Forgetting Risk</span>
                    <span className={`font-mono font-bold ${item.forgetting_risk > 0.5 ? "text-rose-400" : "text-amber-400"}`}>
                      {(item.forgetting_risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.forgetting_risk > 0.5 ? "bg-rose-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, item.forgetting_risk * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Mastery & Half-Life Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Mastery P(L)</span>
                    <span className="font-mono font-semibold text-foreground">
                      {(item.mastery_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Stability (S)</span>
                    <span className="font-mono font-semibold text-foreground">
                      {item.stability_factor} days
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartQuiz(item.subtopic_id)}
                className="mt-4 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition"
              >
                Revise Subtopic <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ONE-BY-ONE ADAPTIVE QUIZ RUNNER WITH IMMEDIATE RESULTS */}
      {isQuizOpen && activeQuiz && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            {!isSessionComplete ? (
              <>
                {/* Header with Syllabus Sequence and Subtopic Name */}
                <div className="flex justify-between items-start border-b border-border/40 pb-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary uppercase tracking-wide">
                      <Layers className="w-3.5 h-3.5" />
                      {currentQuestion?.syllabus_sequence || currentQuestion?.subtopic_name}
                    </div>
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Question {currentQIndex + 1} of {activeQuiz.questions.length} • {currentQuestion?.subject_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg border ${timeRemaining < 20 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-muted text-foreground border-border"}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {timeRemaining}s
                    </span>
                    <button onClick={() => setIsQuizOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="space-y-3">
                  <p className="text-base sm:text-lg text-foreground font-semibold leading-relaxed">
                    {currentQuestion?.question_text}
                  </p>
                  {currentQuestion?.question_image_url && (
                    <img
                      src={currentQuestion.question_image_url}
                      alt="Question Prompt"
                      className="max-h-60 rounded-xl border border-border/50 object-contain mx-auto"
                    />
                  )}
                </div>

                {/* Option Choices */}
                <div className="space-y-2.5">
                  {currentQuestion?.choices.map((choice: any) => {
                    const isSelected = selectedOption === choice.index;
                    const isCorrectKey = isAnswerSubmitted && (
                      choice.index === currentFeedback?.correct_answer_number ||
                      choice.index === currentFeedback?.additional_correct_answer_number
                    );
                    const isWrongSelection = isAnswerSubmitted && isSelected && !currentFeedback?.is_correct;

                    return (
                      <button
                        key={choice.index}
                        disabled={isAnswerSubmitted}
                        onClick={() => setSelectedOption(choice.index)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isCorrectKey
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-100 font-semibold shadow-sm"
                            : isWrongSelection
                            ? "bg-rose-500/15 border-rose-500 text-rose-100 line-through"
                            : isSelected
                            ? "bg-primary/10 border-primary text-foreground font-semibold"
                            : "bg-background border-border/60 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 transition-all ${
                            isCorrectKey
                              ? "bg-emerald-500 text-white"
                              : isWrongSelection
                              ? "bg-rose-500 text-white"
                              : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCorrectKey ? <Check className="w-3.5 h-3.5" /> : isWrongSelection ? <X className="w-3.5 h-3.5" /> : choice.index}
                        </span>

                        <div className="space-y-1">
                          {choice.text && <span className="text-sm">{choice.text}</span>}
                          {choice.image_url && (
                            <img src={choice.image_url} alt={`Choice ${choice.index}`} className="max-h-24 rounded border border-border/40" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* IMMEDIATE EVALUATION & EXPLANATION BANNER */}
                <AnimatePresence>
                  {isAnswerSubmitted && currentFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        currentFeedback.is_correct
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm flex items-center gap-2">
                          {currentFeedback.is_correct ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              Correct Answer! (+{currentFeedback.earned_xp} XP)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-rose-400" />
                              Incorrect. Correct option was #{currentFeedback.correct_answer_number}
                              {currentFeedback.additional_correct_answer_number && ` or #${currentFeedback.additional_correct_answer_number}`}
                            </>
                          )}
                        </span>
                      </div>

                      {currentFeedback.explanation_text && (
                        <div className="text-xs text-foreground/90 bg-background/50 p-3 rounded-xl border border-border/40 space-y-1">
                          <span className="font-bold text-muted-foreground block text-[10px] uppercase">Solution Explanation:</span>
                          <p>{currentFeedback.explanation_text}</p>
                          {currentFeedback.explanation_image_url && (
                            <img src={currentFeedback.explanation_image_url} alt="Solution" className="max-h-36 rounded mt-2 border border-border" />
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Action Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-border/40">
                  <div className="text-xs text-muted-foreground font-mono">
                    Score: {sessionCorrectCount} of {currentQIndex + (isAnswerSubmitted ? 1 : 0)} • {sessionTotalXP} XP
                  </div>

                  {!isAnswerSubmitted ? (
                    <button
                      onClick={handleSubmitCurrentAnswer}
                      disabled={selectedOption === null || submittingAnswer}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition disabled:opacity-40 shadow"
                    >
                      {submittingAnswer ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-500/25 active:scale-95"
                    >
                      {currentQIndex < activeQuiz.questions.length - 1 ? (
                        <>
                          Next Question <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Finish Revision Session <Award className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Session Final Summary Screen */
              <div className="space-y-6 text-center py-6">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
                  <Award className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-foreground">Syllabus Session Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    You answered {sessionCorrectCount} of {activeQuiz.questions.length} questions correctly ({((sessionCorrectCount / activeQuiz.questions.length) * 100).toFixed(0)}%).
                  </p>
                  <p className="text-xs font-bold text-primary mt-1">+{sessionTotalXP} XP Earned to your profile!</p>
                </div>

                <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 text-left space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Duolingo Engine Recalibration Complete
                  </h4>
                  <p className="text-xs text-foreground">
                    Question empirical accuracy and Elo ratings were updated after each submission. Your spaced repetition queue intervals have been updated.
                  </p>
                </div>

                <button
                  onClick={() => setIsQuizOpen(false)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition shadow-lg"
                >
                  Return to Revision Queue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-Over / Drawer: SEE HISTORY */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col z-10"
            >
              <div className="p-5 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Revision History</h3>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading session history...</span>
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No revision sessions yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Start a revision session to track your accuracy, XP, and memory retention.
                    </p>
                  </div>
                ) : (
                  historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-border/60 bg-background/60 hover:border-primary/40 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            {item.session_title || item.subtopic_name || "Revision Session"}
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            {item.subject_name || "General"}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                            item.score_percentage >= 75
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.score_percentage >= 50
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {item.score_percentage.toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30 font-mono">
                        <span>
                          {item.correct_count} / {item.total_questions} correct
                        </span>
                        <span className="text-amber-400 font-semibold">
                          +{item.earned_xp} XP
                        </span>
                        <span>
                          {new Date(item.completed_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
