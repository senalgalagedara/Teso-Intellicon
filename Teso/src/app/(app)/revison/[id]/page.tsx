"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  History,
  RotateCw,
  Award,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Zap,
  TrendingUp,
  Loader2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  startRevisionQuiz,
  submitSingleQuestionAnswer,
  getRevisionHistory,
  recordRevisionSessionHistory,
} from "@/app/actions/revision-actions";

interface Choice {
  index: number;
  text: string;
  image_url?: string | null;
}

interface Question {
  id: string;
  topic_id: string;
  subtopic_id: string;
  subtopic_name: string;
  subtopic_code?: string;
  topic_name?: string;
  syllabus_sequence?: string;
  subject_name: string;
  exam_level: string;
  question_text: string;
  question_image_url?: string | null;
  choices: Choice[];
  time_limit_seconds: number;
}

interface FeedbackState {
  is_correct: boolean;
  correct_answer_number: number;
  additional_correct_answer_number?: number | null;
  explanation_text?: string | null;
  explanation_image_url?: string | null;
  earned_xp: number;
}

interface HistoryItem {
  id: string;
  session_title?: string;
  subject_name?: string;
  subtopic_name?: string;
  score_percentage: number;
  correct_count: number;
  total_questions: number;
  earned_xp: number;
  completed_at: string;
}

export default function RevisionSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = (params?.id as string) || "all";
  const subjectIdParam = searchParams.get("subject_id") || undefined;
  const subtopicIdParam = searchParams.get("subtopic_id") || undefined;

  // Quiz State
  const [loading, setLoading] = useState<boolean>(true);
  const [quizSession, setQuizSession] = useState<{
    session_id: string;
    subject_id?: string | null;
    subject_name?: string | null;
    questions: Question[];
  } | null>(null);

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackState | null>(null);

  // Cumulative Session Score
  const [sessionCorrectCount, setSessionCorrectCount] = useState<number>(0);
  const [sessionTotalXP, setSessionTotalXP] = useState<number>(0);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(90);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // History Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Initialize Session
  useEffect(() => {
    async function initSession() {
      setLoading(true);
      try {
        let subjId = subjectIdParam;
        let subId = subtopicIdParam;

        // If rawId is a valid UUID and no specific params, check if it's subtopic or subject
        if (rawId && rawId !== "all") {
          if (!subId && !subjId) {
            subId = rawId;
          }
        }

        let res;
        try {
          res = await startRevisionQuiz(subjId, subId, 10);
        } catch (err: any) {
          // If failed with subtopic, retry treating rawId as subjectId
          if (subId === rawId && !subjId) {
            res = await startRevisionQuiz(rawId, undefined, 10);
          } else {
            throw err;
          }
        }

        if (!res.questions || res.questions.length === 0) {
          toast.error("No questions found for this revision unit. Returning to queue.");
          router.push("/revison");
          return;
        }

        setQuizSession(res);
        setCurrentQIndex(0);
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
        setCurrentFeedback(null);
        setSessionCorrectCount(0);
        setSessionTotalXP(0);
        setIsSessionComplete(false);
        setTimeRemaining(res.questions[0].time_limit_seconds || 90);
        startTimeRef.current = Date.now();
      } catch (err: any) {
        console.error("Failed to start revision session:", err);
        toast.error(err.message || "Could not start revision quiz.");
        router.push("/revison");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [rawId, subjectIdParam, subtopicIdParam, router]);

  // Countdown Timer
  useEffect(() => {
    if (!quizSession || isSessionComplete || isAnswerSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizSession, currentQIndex, isAnswerSubmitted, isSessionComplete]);

  // Load Revision History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getRevisionHistory(30);
      setHistoryItems(data || []);
    } catch (err: any) {
      console.error("Error fetching revision history:", err);
      toast.error("Failed to load revision history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    fetchHistory();
  };

  // Submit Current Answer
  const handleSubmitAnswer = async () => {
    if (!quizSession || selectedOption === null || submittingAnswer || isAnswerSubmitted) return;

    const currentQ = quizSession.questions[currentQIndex];
    const elapsedMs = Date.now() - startTimeRef.current;

    setSubmittingAnswer(true);
    try {
      const result = await submitSingleQuestionAnswer(
        quizSession.session_id,
        currentQ.id,
        selectedOption,
        elapsedMs
      );

      setIsAnswerSubmitted(true);
      setCurrentFeedback({
        is_correct: result.is_correct,
        correct_answer_number: result.correct_answer_number,
        additional_correct_answer_number: result.additional_correct_answer_number,
        explanation_text: result.explanation_text,
        explanation_image_url: result.explanation_image_url,
        earned_xp: result.earned_xp || (result.is_correct ? 15 : 3),
      });

      if (result.is_correct) {
        setSessionCorrectCount((prev) => prev + 1);
        setSessionTotalXP((prev) => prev + (result.earned_xp || 15));
        toast.success("Correct Answer! (+15 XP)");
      } else {
        setSessionTotalXP((prev) => prev + (result.earned_xp || 3));
        toast.error(`Incorrect. Option ${result.correct_answer_number} was correct.`);
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Move to Next Question
  const handleNextQuestion = async () => {
    if (!quizSession) return;

    if (currentQIndex < quizSession.questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setCurrentFeedback(null);
      setTimeRemaining(quizSession.questions[nextIdx]?.time_limit_seconds || 90);
      startTimeRef.current = Date.now();
    } else {
      // Completed entire quiz
      setIsSessionComplete(true);
      const totalQ = quizSession.questions.length;
      const scorePct = totalQ > 0 ? (sessionCorrectCount / totalQ) * 100 : 0;
      const firstQ = quizSession.questions[0];

      try {
        await recordRevisionSessionHistory({
          session_id: quizSession.session_id,
          subject_id: quizSession.subject_id || null,
          subtopic_id: firstQ?.subtopic_id || null,
          session_title: firstQ?.subtopic_name
            ? `${firstQ.subtopic_name} Revision`
            : "Adaptive Revision Session",
          score_percentage: Math.round(scorePct * 10) / 10,
          correct_count: sessionCorrectCount,
          total_questions: totalQ,
          earned_xp: sessionTotalXP,
        });
      } catch (err) {
        console.warn("Could not save session history:", err);
      }
    }
  };

  const handleRestartSession = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Calibrating adaptive revision sequence...
        </p>
      </div>
    );
  }

  if (!quizSession || quizSession.questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No questions found</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          There are currently no revision questions available in this queue.
        </p>
        <button
          onClick={() => router.push("/revison")}
          className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm"
        >
          Return to Revision Dashboard
        </button>
      </div>
    );
  }

  const currentQ = quizSession.questions[currentQIndex];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/revison")}
            className="p-2 rounded-xl border border-border/60 hover:bg-muted/60 transition text-muted-foreground hover:text-foreground"
            title="Return to Revision Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {quizSession.subject_name || currentQ?.subject_name || "Combined Mathematics"}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {currentQ?.exam_level === "AL" ? "(A/L)" : "(O/L)"}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: See History Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenHistory}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-sm transition active:scale-95"
          >
            <History className="w-4 h-4 text-primary" />
            <span>See History</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        {!isSessionComplete ? (
          <div className="space-y-6">
            {/* Question Card Header */}
            <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Breadcrumb / Sequence Line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {currentQ.syllabus_sequence ||
                        (currentQ.topic_name
                          ? `${currentQ.topic_name} > ${currentQ.subtopic_name}`
                          : currentQ.subtopic_name)}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Question {currentQIndex + 1} of {quizSession.questions.length} •{" "}
                    {currentQ.subject_name} ({currentQ.exam_level})
                  </h2>
                </div>

                {/* Countdown Timer Badge */}
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl border font-bold transition-colors ${
                      timeRemaining <= 15
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse"
                        : "bg-muted text-foreground border-border/60"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeRemaining}s</span>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentQ.question_text}
                </p>

                {currentQ.question_image_url && (
                  <div className="pt-2">
                    <img
                      src={currentQ.question_image_url}
                      alt="Question Diagram"
                      className="max-h-72 w-auto rounded-2xl border border-border object-contain shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Answer Choices List */}
              <div className="space-y-3 pt-2">
                {currentQ.choices.map((choice) => {
                  const isSelected = selectedOption === choice.index;
                  const isCorrectKey =
                    isAnswerSubmitted &&
                    currentFeedback &&
                    (choice.index === currentFeedback.correct_answer_number ||
                      choice.index === currentFeedback.additional_correct_answer_number);
                  const isWrongSelection =
                    isAnswerSubmitted &&
                    isSelected &&
                    !currentFeedback?.is_correct;

                  let cardStyle =
                    "bg-background/80 border-border/70 hover:border-border hover:bg-muted/40 text-foreground";

                  if (isCorrectKey) {
                    cardStyle =
                      "bg-emerald-500/15 border-emerald-500 text-emerald-100 font-semibold shadow-sm";
                  } else if (isWrongSelection) {
                    cardStyle =
                      "bg-rose-500/15 border-rose-500 text-rose-200 line-through opacity-85";
                  } else if (isSelected) {
                    cardStyle =
                      "bg-blue-500/10 border-blue-500 text-foreground font-semibold shadow-sm";
                  }

                  let badgeStyle = "bg-muted text-muted-foreground border-border/80";
                  if (isCorrectKey) {
                    badgeStyle = "bg-emerald-500 text-white border-emerald-500";
                  } else if (isWrongSelection) {
                    badgeStyle = "bg-rose-500 text-white border-rose-500";
                  } else if (isSelected) {
                    badgeStyle = "bg-blue-600 text-white border-blue-600";
                  }

                  return (
                    <button
                      key={choice.index}
                      type="button"
                      disabled={isAnswerSubmitted}
                      onClick={() => setSelectedOption(choice.index)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 focus:outline-none ${cardStyle}`}
                    >
                      {/* Choice Number Badge (1, 2, 3, 4, 5) */}
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 border transition-all ${badgeStyle}`}
                      >
                        {isCorrectKey ? (
                          <Check className="w-4 h-4" />
                        ) : isWrongSelection ? (
                          <X className="w-4 h-4" />
                        ) : (
                          choice.index
                        )}
                      </span>

                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <span className="text-sm sm:text-base leading-snug">
                          {choice.text}
                        </span>
                        {choice.image_url && (
                          <img
                            src={choice.image_url}
                            alt={`Option ${choice.index}`}
                            className="max-h-28 rounded-lg border border-border/40 mt-2"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Solution Explanation Banner (Hidden: Duolingo diff text) */}
              <AnimatePresence>
                {isAnswerSubmitted && currentFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      currentFeedback.is_correct
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base flex items-center gap-2">
                        {currentFeedback.is_correct ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            Correct Answer! (+{currentFeedback.earned_xp} XP)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-rose-400" />
                            Incorrect. Correct option was #{currentFeedback.correct_answer_number}
                            {currentFeedback.additional_correct_answer_number &&
                              ` or #${currentFeedback.additional_correct_answer_number}`}
                          </>
                        )}
                      </span>
                    </div>

                    {currentFeedback.explanation_text && (
                      <div className="text-xs sm:text-sm text-foreground/90 bg-background/60 p-3.5 rounded-xl border border-border/40 space-y-1.5">
                        <span className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wider">
                          Solution Explanation:
                        </span>
                        <p className="leading-relaxed">{currentFeedback.explanation_text}</p>
                        {currentFeedback.explanation_image_url && (
                          <img
                            src={currentFeedback.explanation_image_url}
                            alt="Explanation diagram"
                            className="max-h-40 rounded-xl mt-2 border border-border"
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Action Footer with Score & BLUE Next Question Button */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border/40">
                <div className="text-xs sm:text-sm text-muted-foreground font-mono">
                  Score: {sessionCorrectCount} of{" "}
                  {currentQIndex + (isAnswerSubmitted ? 1 : 0)} • {sessionTotalXP} XP
                </div>

                {!isAnswerSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null || submittingAnswer}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:opacity-90 transition disabled:opacity-40 shadow"
                  >
                    {submittingAnswer ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Submit Answer
                  </button>
                ) : (
                  /* User specified: BLUE Next Question Button */
                  <button
                    onClick={handleNextQuestion}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-blue-500/25 active:scale-95"
                  >
                    {currentQIndex < quizSession.questions.length - 1 ? (
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
            </div>
          </div>
        ) : (
          /* Session Completion View */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/60 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl"
          >
            <div className="w-20 h-20 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 mx-auto flex items-center justify-center">
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Revision Session Complete!
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Great job completing your spaced repetition cycle for this syllabus unit.
              </p>
            </div>

            {/* Score Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="bg-background/80 border border-border/60 p-4 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground block">Accuracy</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                  {quizSession.questions.length > 0
                    ? `${Math.round((sessionCorrectCount / quizSession.questions.length) * 100)}%`
                    : "0%"}
                </span>
              </div>

              <div className="bg-background/80 border border-border/60 p-4 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground block">Correct</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  {sessionCorrectCount} / {quizSession.questions.length}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-background/80 border border-border/60 p-4 rounded-2xl text-center space-y-1">
                <span className="text-xs text-muted-foreground block">Earned XP</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4" />+{sessionTotalXP}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={handleRestartSession}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border/80 bg-background hover:bg-muted font-semibold text-xs sm:text-sm text-foreground inline-flex items-center justify-center gap-2 transition"
              >
                <RotateCw className="w-4 h-4" /> Revise Again
              </button>
              <button
                onClick={() => router.push("/revison")}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"
              >
                Return to Revision Hub <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Slide-Over / Drawer: SEE HISTORY */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Right Drawer Panel */}
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
                    <span className="text-xs text-muted-foreground">Loading session logs...</span>
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No revision history yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Complete a revision quiz to record your session accuracy, XP, and memory retention.
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
                            {item.session_title || item.subtopic_name || "Revision Quiz"}
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
