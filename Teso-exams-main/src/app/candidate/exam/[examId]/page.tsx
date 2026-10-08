"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Clock, User, FileText, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";

import { QuestionCard } from "@/components/exams/QuestionCard";
import { QuestionNav } from "@/components/exams/QuestionNav";
import { getPaperQuestions } from "@/app/actions/exam";
import {
  getParticipantStatus,
  submitExamAnswers,
  getParticipantAnswers,
  updateParticipantProgress,
  updateCandidateStatus
} from "@/app/actions/candidate";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";

function ExamSessionContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Local theme state for candidate exam interface
  const [examTheme, setExamTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("candidate-exam-theme") as "light" | "dark" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setExamTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (examTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("candidate-exam-theme", examTheme);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [examTheme]);

  const examCode = (Array.isArray(params.examId) ? params.examId[0] : params.examId) || "";
  const participantId = searchParams.get("participantId") || "";

  // Participant & Session State
  const [participant, setParticipant] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  
  // Questions State
  const [questions, setQuestions] = useState<any[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, number>>({});
  
  // Running State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  
  // Dynamic duration calculated relative to session start
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>(undefined);

  // 1. Initial Load & Setup
  useEffect(() => {
    const init = async () => {
      if (!participantId || !examCode) return;
      try {
        const pRes = await getParticipantStatus(participantId);
        if (!pRes.success || !pRes.data) {
          toast.error("Invalid participant session.");
          router.push("/");
          return;
        }

        const partData = pRes.data;
        const sessData = partData.session;

        console.log("DEBUG: exam init data loaded:", {
          partStatus: partData.status,
          sessionStatus: sessData.status,
          startedAt: sessData.startedAt,
          durationMins: sessData.durationMins,
          clientNowStr: new Date().toISOString(),
          clientNowMs: Date.now(),
        });

        // Verify status
        if (partData.status === "DECLINED" || partData.status === "KICKED") {
          toast.error("Access denied or you have been removed.");
          router.push("/");
          return;
        }

        if (partData.status === "SUBMITTED") {
          const redirectParams = new URLSearchParams({
            fullName: partData.fullName || "",
            userId: partData.userId || "",
            paperId: sessData?.paperId || "",
            examCode: examCode || ""
          });
          router.push(`/candidate/submitted?${redirectParams.toString()}`);
          return;
        }

        setParticipant(partData);
        setSession(sessData);

        // Fetch Questions using paperId from the session
        const qData = await getPaperQuestions(sessData.paperId);
        setQuestions(qData);

        // Prepare Correct Answers Map for local scoring
        const correctAnswersMap: Record<number, number> = {};
        qData.forEach((q: any, idx: number) => {
          if (q.correctAnswer !== undefined) {
            correctAnswersMap[idx] = q.correctAnswer;
          }
        });
        setCorrectAnswers(correctAnswersMap);

        // Initialize time tracking
        const initialTime: Record<number, number> = {};
        qData.forEach((_, idx) => (initialTime[idx] = 0));
        setTimeSpent(initialTime);

        // Fetch existing answers from database
        const answersRes = await getParticipantAnswers(sessData.paperId, partData.userId);
        const existingAnswersMap: Record<number, number[]> = {};
        
        if (answersRes.success && answersRes.data) {
          // Group by paperDetailId
          const groupedByDetailId: Record<string, number[]> = {};
          answersRes.data.forEach((r) => {
            if (r.selectedOption !== null) {
              const optIdx = r.selectedOption - 1;
              if (!groupedByDetailId[r.paperDetailId]) {
                groupedByDetailId[r.paperDetailId] = [];
              }
              groupedByDetailId[r.paperDetailId].push(optIdx);
            }
          });

          // Map to question index
          qData.forEach((q: any, idx: number) => {
            if (groupedByDetailId[q.id]) {
              existingAnswersMap[idx] = groupedByDetailId[q.id];
            }
          });
        }
        setAnswers(existingAnswersMap);

        // Calculate initial remaining duration
        if (sessData.startedAt) {
          const startTimeMs = new Date(sessData.startedAt).getTime();
          const endTimeMs = startTimeMs + sessData.durationMins * 60 * 1000;
          const remainingSecs = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
          setDurationSeconds(remainingSecs);
        }

        // Update participant status to IN_EXAM if it wasn't already set
        if (partData.status === "ADMITTED") {
          await updateCandidateStatus(participantId, "IN_EXAM");
        }

      } catch (err) {
        console.error("Failed to load exam:", err);
        toast.error("An error occurred while loading the exam.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [participantId, examCode, router]);

  // 2. Real-time polling removed - we now use Socket.IO!

  // 3. Keep track of spent time per question
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!loading && !isSubmitted && !isSubmitting) {
      interval = setInterval(() => {
        setTimeSpent((prev) => ({
          ...prev,
          [currentQuestion]: (prev[currentQuestion] || 0) + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentQuestion, loading, isSubmitted, isSubmitting]);

  // 4. Handle Option Selection
  const handleAnswerSelect = async (answerIndex: number) => {
    if (isSubmitted || isSubmitting) return;

    const currentSelected = answers[currentQuestion] || [];
    let newSelected: number[];
    if (currentSelected.includes(answerIndex)) {
      newSelected = currentSelected.filter((idx) => idx !== answerIndex);
    } else {
      newSelected = [...currentSelected, answerIndex];
    }

    // Local state updates
    const newAnswers = { ...answers, [currentQuestion]: newSelected };
    setAnswers(newAnswers);

    const question = questions[currentQuestion];

    try {
      // Save all checked options to DB (1-indexed in DB)
      const selectedOptionsDb = newSelected.map((opt) => opt + 1);

      await submitExamAnswers(
        question.id, // paperDetailId
        participant.userId, // userId
        selectedOptionsDb, // selectedOptions
        null, // numericAnswer
        timeSpent[currentQuestion] || 0 // time spent
      );

      // Update real-time progress for host monitor
      const answeredCount = Object.values(newAnswers).filter((arr) => arr && arr.length > 0).length;
      await updateParticipantProgress(participantId, answeredCount);
    } catch (err) {
      console.error("Failed to submit option:", err);
    }
  };

  const handleToggleMark = () => {
    if (isSubmitted || isSubmitting) return;
    setMarkedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  };

  // 5. Submit Exam Flow
  const performSubmission = async (isAuto = false) => {
    if (isSubmitting || isSubmitted) return;

    try {
      setIsSubmitting(true);
      if (isAuto) {
        toast.info("Submitting your exam...", { duration: 4005 });
      }

      // Calculate final score:
      // Give 1 point for each question, divided by the number of correct options if multiple correct options exist.
      // Finally, multiply the sum of points by the total number of questions.
      let totalPoints = 0;
      questions.forEach((q, idx) => {
        const selectedList = answers[idx] || [];
        if (selectedList.length === 0) return;

        const correctSet = new Set<number>();
        if (q.correctAnswer !== undefined && q.correctAnswer !== null) correctSet.add(q.correctAnswer);
        if (q.correctAnswer2 !== undefined && q.correctAnswer2 !== null) correctSet.add(q.correctAnswer2);

        if (correctSet.size === 0) return;

        // Verify no incorrect options were selected to prevent "check all options" exploits
        const hasWrongSelection = selectedList.some((opt) => !correctSet.has(opt));
        if (hasWrongSelection) return;

        const pointValue = 1 / correctSet.size;
        selectedList.forEach((opt) => {
          if (correctSet.has(opt)) {
            totalPoints += pointValue;
          }
        });
      });

      const score = questions.length > 0
        ? Math.round(((totalPoints / questions.length) * 100) * 10) / 10
        : 0;

      // Update participant status in DB
      await updateCandidateStatus(participantId, "SUBMITTED", score);
      setIsSubmitted(true);

      // Clear the local fallback timer storage if it exists
      if (typeof window !== "undefined") {
        localStorage.removeItem(`exam_start_${examCode}`);
      }

      // Redirect with full exam parameters
      const redirectParams = new URLSearchParams({
        fullName: participant?.fullName || "",
        userId: participant?.userId || "",
        paperId: session?.paperId || "",
        examCode: examCode || ""
      });
      router.push(`/candidate/submitted?${redirectParams.toString()}`);
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error("Failed to submit exam. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Connect to Socket.IO for real-time exam control and timer synchronization
  useEffect(() => {
    if (!examCode || !participantId || loading) return;

    const socket = io();
    socket.emit('join-exam-room', { examCode, participantId });

    socket.on('timer-sync', (data: any) => {
      if (data.remainingSeconds !== undefined) {
        setDurationSeconds(data.remainingSeconds);
      }
    });

    socket.on('exam-ended', async () => {
      toast.info("The host has ended the exam session.");
      await performSubmission(true);
    });

    socket.on('student-kicked', (data: any) => {
      if (data.participantId === participantId) {
        toast.error("You have been kicked out of the exam session.");
        router.push("/");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [examCode, participantId, loading, router]);

  const handleFinishExam = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);
    await performSubmission(false);
  };

  const handleTimeUp = () => {
    performSubmission(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Entering Exam Room...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-background-secondary border border-border rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">No Questions Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          This exam paper doesn't have questions uploaded yet.
        </p>
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="px-6 font-semibold"
        >
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-emerald-950 selection:text-emerald-300 flex flex-col">
      {/* Header Info */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm sm:text-md font-bold tracking-tight text-foreground uppercase">
            {session?.paper?.title || "Exam paper"}
          </h1>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Candidate: {participant?.fullName} ({participant?.classCode})
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExamTheme(examTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-lg border border-border"
          >
            <Sun className={`h-[1.1rem] w-[1.1rem] transition-all text-foreground ${examTheme === "dark" ? "-rotate-90 scale-0" : "rotate-0 scale-100"}`} />
            <Moon className={`absolute h-[1.1rem] w-[1.1rem] transition-all text-foreground ${examTheme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"}`} />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Active
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Question Area */}
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 py-4">
          <div className="flex-1 flex flex-col items-center justify-center py-2 lg:py-4">
            <QuestionCard
              question={questions[currentQuestion]}
              questionNumber={currentQuestion + 1}
              selectedAnswers={answers[currentQuestion] || []}
              onAnswerSelect={handleAnswerSelect}
              isMarked={markedQuestions.has(currentQuestion)}
              onToggleMark={handleToggleMark}
              isSubmitted={false}
            />
          </div>

          {/* Navigation Bar */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 lg:relative lg:bg-transparent lg:border-0 lg:p-0 flex gap-3 justify-between flex-shrink-0 z-10 lg:z-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="flex-1 lg:flex-none px-6 py-2.5 font-semibold"
            >
              Previous
            </Button>

            <Button
              variant="outline"
              onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="flex-1 lg:flex-none px-6 py-2.5 font-semibold"
            >
              Next
            </Button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <QuestionNav
          totalQuestions={questions.length}
          currentQuestion={currentQuestion}
          answers={answers}
          markedQuestions={markedQuestions}
          onQuestionSelect={setCurrentQuestion}
          onFinishExam={handleFinishExam}
          examId={examCode}
          onTimeUp={handleTimeUp}
          isSubmitted={isSubmitted}
          isSubmitting={isSubmitting}
          correctAnswers={correctAnswers}
          durationSeconds={durationSeconds}
        />
      </div>

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        title="Finish Exam?"
        description="Are you sure you want to finish and submit your exam? This action cannot be undone."
        confirmText="Yes, Submit"
        cancelText="Keep Answering"
        onConfirm={handleConfirmSubmit}
        isLoading={isSubmitting}
        variant="success"
      />
    </div>
  );
}

export default function CandidateExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <ExamSessionContent />
    </Suspense>
  );
}
