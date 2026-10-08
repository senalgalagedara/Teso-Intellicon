"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuestionCard } from '@/components/exams/QuestionCard';
import { QuestionNav } from '@/components/exams/QuestionNav';
import { Loader2, RotateCcw, Eye, FileText } from 'lucide-react'; 
import { getPaperQuestions, submitExam, submitTutionExam } from '@/app/actions/exam';
import { toast } from 'sonner';

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  
  // Data State
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Exam Execution State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});

  // View State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [viewMode, setViewMode] = useState<'attempt' | 'summary' | 'review'>('attempt');
  
  // Results Data
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [navKey, setNavKey] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Questions & Restore State
  useEffect(() => {
    const initializeExam = async () => {
      if (!params?.id) return;

      try {
        // A. Load Questions
        const data = await getPaperQuestions(params.id as string);
        setQuestions(data);

        // B. Pre-load correct answers if they are provided from the database
        const answersMap: Record<number, number> = {};
        data.forEach((q: any, idx: number) => {
          if (q.correctAnswer !== undefined) {
            answersMap[idx] = q.correctAnswer;
          }
        });
        setCorrectAnswers(answersMap);
        setTotal(data.length);

        // C. Initialize time tracking
        const initialTime: Record<number, number> = {};
        data.forEach((_, idx) => initialTime[idx] = 0);
        setTimeSpent(initialTime);

        // B. Check for Existing Submission (Results Persistence)
        const savedResult = localStorage.getItem(`exam_result_${params.id}`);
        if (savedResult) {
            const parsedResult = JSON.parse(savedResult);
            setCorrectAnswers(parsedResult.correctAnswers);
            setScore(parsedResult.score);
            setTotal(parsedResult.total);
            setIsSubmitted(true);
            
            // If they had a specific view mode saved, or default to summary
            setViewMode(parsedResult.viewMode || 'summary');
            
            // Also restore their answers so they can review them
            const savedAnswers = localStorage.getItem(`exam_answers_${params.id}`);
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
        } else {
            // C. If no result, restore ongoing attempt
            const savedAnswers = localStorage.getItem(`exam_answers_${params.id}`);
            const savedMarked = localStorage.getItem(`exam_marked_${params.id}`);
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
            if (savedMarked) setMarkedQuestions(new Set(JSON.parse(savedMarked)));
        }

      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeExam();
  }, [params?.id]);

  // 2. Persist ongoing answers (Only if not submitted)
  useEffect(() => {
    if (params?.id && !isSubmitted && !loading) {
      localStorage.setItem(`exam_answers_${params.id}`, JSON.stringify(answers));
      localStorage.setItem(`exam_marked_${params.id}`, JSON.stringify(Array.from(markedQuestions)));
    }
  }, [answers, markedQuestions, params?.id, isSubmitted, loading]);

  // 3. Per-Question Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!loading && !isSubmitted && viewMode === 'attempt') {
      interval = setInterval(() => {
        setTimeSpent((prev) => ({
          ...prev,
          [currentQuestion]: (prev[currentQuestion] || 0) + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentQuestion, loading, isSubmitted, viewMode]);

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleToggleMark = (questionIndex: number) => {
    if (isSubmitted) return;
    setMarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) newSet.delete(questionIndex);
      else newSet.add(questionIndex);
      return newSet;
    });
  };

  // 4. Submission Logic
  const performSubmission = async (isAuto = false) => {
    if(loading || questions.length === 0 || isSubmitted || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (isAuto) {
        toast.info("Time's up! Submitting your exam automatically...", {
          duration: 5000,
        });
      }

      if (params?.id) {
        const isTuition = questions[0]?.isTuition;
        const classCardNumber = localStorage.getItem(`class_card_${params.id}`) || '';

        let result: any;
        if (isTuition) {
          result = await submitTutionExam(
            params.id as string,
            answers,
            timeSpent,
            Array.from(markedQuestions),
            classCardNumber
          );
        } else {
          result = await submitExam(
            params.id as string, 
            answers, 
            timeSpent,
            Array.from(markedQuestions)
          );
        }
        
        if (result?.success === false) {
          const errorMsg = result?.error || "Submission failed";
          console.error("Server Error:", errorMsg);
          throw new Error(errorMsg);
        }

        setCorrectAnswers(result?.correctAnswers || {});
        setScore(result?.score || 0);
        setTotal(result?.total || 0);
        setIsSubmitted(true);
        setViewMode('summary');

        // SAVE RESULT TO LOCAL STORAGE
        localStorage.setItem(`exam_result_${params.id}`, JSON.stringify({
            score: result?.score || 0,
            total: result?.total || 0,
            correctAnswers: result?.correctAnswers || {},
            viewMode: 'summary',
            timestamp: Date.now()
        }));

        if (isAuto) {
          toast.success("Exam submitted successfully!");
        }
      }
    } catch (error: any) {
      console.error('Submission failed:', error);
      toast.error(error.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishExam = () => {
    if (window.confirm("Are you sure you want to finish the exam?")) {
      performSubmission(false);
    }
  };

  const handleTimeUp = () => {
    performSubmission(true);
  };

  // 5. Reattempt Logic
  const handleReattempt = () => {
    if (window.confirm("Do you want to clear your answers and start over?")) {
        if (params?.id) {
            localStorage.removeItem(`exam_answers_${params.id}`);
            localStorage.removeItem(`exam_marked_${params.id}`);
            localStorage.removeItem(`exam_result_${params.id}`);
            localStorage.removeItem(`exam_start_${params.id}`);
        }

        setAnswers({});
        setMarkedQuestions(new Set());
        setTimeSpent({}); 
        setIsSubmitted(false);
        setViewMode('attempt');
        setScore(0);
        setCurrentQuestion(0);
        
        setNavKey(prev => prev + 1); 
    }
  };

  const handleViewModeChange = (mode: 'summary' | 'review') => {
      setViewMode(mode);
      if (isSubmitted && params?.id) {
          const existing = JSON.parse(localStorage.getItem(`exam_result_${params.id}`) || '{}');
          localStorage.setItem(`exam_result_${params.id}`, JSON.stringify({
              ...existing,
              viewMode: mode
          }));
      }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center transition-colors">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-full bg-background flex flex-col items-center justify-center p-4 text-center transition-colors">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 border border-border">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">No Questions Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          We couldn't find any questions for this paper. It might still be under preparation or the ID is incorrect.
        </p>
        <button 
          onClick={() => router.push('/exams')}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          Back to Exams
        </button>
      </div>
    );
  }

  // --- SUMMARY VIEW ---
  if (viewMode === 'summary') {
      return (
        <div className="min-h-full bg-background flex items-center justify-center p-4 transition-colors">
            <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300 shadow-lg dark:shadow-none">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-10 h-10 text-emerald-500" />
                </div>
                
                <h1 className="text-3xl font-bold text-foreground">Exam Submitted</h1>
                <p className="text-muted-foreground">
                    Your answers have been securely recorded. <br/>
                    You scored <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{score} / {total}</span>
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button 
                        onClick={() => handleViewModeChange('review')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/60 rounded-lg transition-colors text-sm sm:text-base"
                    >
                        <Eye className="w-4 h-4" />
                        Check Answers
                    </button>
                    <button 
                        onClick={handleReattempt}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Retake Exam
                    </button>
                </div>
            </div>
        </div>
      )
  }

  // --- EXAM / REVIEW VIEW ---
  return (
    <div className="min-h-full bg-background text-foreground transition-colors duration-300">
      {/* flex-col for mobile, flex-row for lg screens */}
      {/* Height: min-h for mobile scrolling, fixed h for desktop sidebar layout */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-89px)] lg:h-[calc(100vh-89px)]">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 lg:px-6">
            
          {viewMode === 'review' && (
              <div className="bg-card border border-emerald-500/20 px-4 py-3 rounded-xl mt-4 flex items-center justify-between gap-4 shadow-lg shadow-emerald-500/5 animate-in slide-in-from-top duration-300 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                          <Eye className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                          <p className="text-sm font-bold text-foreground">Review Mode</p>
                          <p className="text-xs text-muted-foreground">Correct answers are highlighted in green.</p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => handleViewModeChange('summary')} 
                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-xs font-medium transition-colors border border-border"
                    >
                        Summary
                    </button>
                    <button 
                        onClick={handleReattempt} 
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium transition-colors border border-emerald-500/30 flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Retake
                    </button>
                  </div>
              </div>
          )}

          {/* Changed: Removed fixed flex centering on mobile to allow natural flow if question is long */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 lg:py-6">
            <QuestionCard
              question={questions[currentQuestion]}
              questionNumber={currentQuestion + 1}
              selectedAnswer={answers[currentQuestion]}
              onAnswerSelect={(answerIndex) => handleAnswerSelect(currentQuestion, answerIndex)}
              isMarked={markedQuestions.has(currentQuestion)}
              onToggleMark={() => handleToggleMark(currentQuestion)}
              isSubmitted={viewMode === 'review'}
              correctAnswer={correctAnswers[currentQuestion]} 
            />
          </div>

          {/* Nav Buttons */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/40 p-4 lg:relative lg:bg-transparent lg:border-0 lg:p-0 flex gap-3 justify-between lg:pb-4 flex-shrink-0 z-10 lg:z-0 mb-4 lg:mb-0 transition-colors">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="flex-1 lg:flex-none px-6 lg:px-10 py-3.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all font-medium shadow-sm dark:shadow-lg"
            >
              Previous
            </button>
            
            <button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="flex-1 lg:flex-none px-6 lg:px-10 py-3.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all font-medium shadow-sm dark:shadow-lg"
            >
              Next
            </button>
          </div>
        </div>

        {/* Sidebar / Mobile Nav Wrapper */}
        <QuestionNav
          totalQuestions={questions.length}
          currentQuestion={currentQuestion}
          answers={answers}
          markedQuestions={markedQuestions}
          onQuestionSelect={setCurrentQuestion}
          onFinishExam={handleFinishExam}
          examId={params?.id as string}
          onTimeUp={handleTimeUp}
          isSubmitted={isSubmitted}
          isSubmitting={isSubmitting}
          correctAnswers={correctAnswers}
          key={navKey}
        />
      </div>
    </div>
  );
}