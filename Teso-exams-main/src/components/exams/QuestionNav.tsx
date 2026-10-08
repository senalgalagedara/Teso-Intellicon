"use client";

import { Grid3x3, X, Clock, CheckSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface QuestionNavProps {
  totalQuestions: number;
  currentQuestion: number;
  answers: Record<number, number[]>;
  markedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
  onFinishExam: () => void;
  examId: string;
  onTimeUp: () => void;
  isSubmitted?: boolean;
  isSubmitting?: boolean;
  correctAnswers?: Record<number, number>;
  durationSeconds?: number;
}

export function QuestionNav({ 
  totalQuestions, 
  currentQuestion, 
  answers, 
  markedQuestions, 
  onQuestionSelect, 
  onFinishExam, 
  examId, 
  onTimeUp, 
  isSubmitted,
  isSubmitting,
  correctAnswers,
  durationSeconds
}: QuestionNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSeconds !== undefined ? durationSeconds : 7200); 
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (isSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
      return;
    }

    if (durationSeconds !== undefined) {
      setTimeLeft(durationSeconds);
      const startTime = Date.now();

      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, durationSeconds - elapsed);
        
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          onTimeUpRef.current();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      const EXAM_DURATION = 7200 * 1000; // 2 hours
      const storageKey = `exam_start_${examId}`;
      let startTime = parseInt(localStorage.getItem(storageKey) || '0');

      if (!startTime) {
        startTime = Date.now();
        localStorage.setItem(storageKey, startTime.toString());
      }

      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, Math.ceil((EXAM_DURATION - elapsed) / 1000));
        
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          onTimeUpRef.current();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [examId, isSubmitted, durationSeconds]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.values(answers).filter((arr) => arr && arr.length > 0).length;
  const progress = (answeredCount / totalQuestions) * 100;

  return (
    <>
      {/* Mobile button - Moved up to clear sticky nav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-20 right-4 w-12 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-lg flex items-center justify-center z-[60] transition-colors border border-emerald-400/20 text-white cursor-pointer"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Grid3x3 className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile panel */}
      <div className={`
        lg:hidden fixed bottom-0 left-0 right-0
        bg-card border-t border-border rounded-t-2xl
        transition-transform duration-300 z-50
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        shadow-xl
      `}>
          <div className="p-3.5 border-b border-border flex items-center justify-between">
            <span className="text-foreground font-medium text-sm">Question Navigator</span>
            <div className="flex items-center gap-1.5 text-emerald-650 dark:text-emerald-400 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5" />
                {isSubmitted ? "Finished" : formatTime(timeLeft)}
            </div>
          </div>

          <div className="p-3.5 max-h-[50vh] overflow-y-auto">
             <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                {Array.from({ length: totalQuestions }, (_, i) => {
                    const isAnswered = i in answers && answers[i] && answers[i].length > 0;
                    const isCurrent = i === currentQuestion;
                    const isMarked = markedQuestions.has(i);
                    const isCorrect = isSubmitted && correctAnswers && answers[i] && answers[i].includes(correctAnswers[i]);
                    const isWrong = isSubmitted && correctAnswers && answers[i] && answers[i].length > 0 && !answers[i].includes(correctAnswers[i]);
                    const isUnanswered = isSubmitted && correctAnswers && (!answers[i] || answers[i].length === 0);

                    return (
                        <button
                          key={i}
                          onClick={() => { onQuestionSelect(i); setIsOpen(false); }}
                          className={`
                             h-8 w-full rounded-lg text-xs font-medium relative transition-all cursor-pointer
                             ${isCurrent 
                               ? 'bg-emerald-500 text-primary-foreground font-bold ring-1 ring-emerald-550 dark:ring-emerald-400' 
                               : isCorrect
                                 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-450 border border-emerald-500/30'
                                 : isWrong
                                   ? 'bg-rose-500/20 text-rose-600 dark:text-rose-450 border border-rose-500/30'
                                   : isUnanswered
                                     ? 'bg-background text-muted-foreground border border-border dashed'
                                     : isAnswered 
                                       ? 'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20' 
                                       : 'bg-background-secondary text-muted-foreground border border-border'
                             }
                          `}
                        >
                          {i+1}
                          {isMarked && !isCorrect && !isWrong && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          )}
                        </button>
                    )
                })}
             </div>
             
             <div className="mt-4 pt-3 border-t border-border">
                <Button
                    onClick={() => { setIsOpen(false); onFinishExam(); }}
                    disabled={isSubmitted || isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                    <CheckSquare className="w-4 h-4" />
                    {isSubmitted ? "Exam Finished" : isSubmitting ? "Submitting..." : "Finish Exam"}
                </Button>
             </div>
          </div>
      </div>

      {/* Desktop right sidebar */}
      <div className="hidden lg:flex w-64 bg-card border-l border-border sticky top-[57px] h-[calc(100vh-57px)] flex-col transition-colors duration-200">
        <div className="p-3 border-b border-border flex-shrink-0">
          <h3 className="text-foreground font-semibold mb-2.5 text-xs uppercase tracking-wider">Exam Progress</h3>
          
          <div className="mb-3 p-3 bg-background-secondary border border-border rounded-xl">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-emerald-650 dark:text-emerald-400" />
              <span className="tabular-nums text-2xl font-bold font-mono text-emerald-650 dark:text-emerald-450">
                {isSubmitted ? "0:00:00" : formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Answered Questions</span>
              <span className="font-semibold text-foreground">{answeredCount}/{totalQuestions}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <Button
            onClick={onFinishExam}
            disabled={isSubmitted || isSubmitting} 
            className="w-full mt-3 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm cursor-pointer disabled:opacity-50"
          >
             <CheckSquare className="w-3.5 h-3.5" />
             <span>{isSubmitted ? "Exam Finished" : isSubmitting ? "Submitting..." : "Finish Exam"}</span>
          </Button>
        </div>

        {/* Question Grid Section */}
        <div className="p-3 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const isAnswered = i in answers && answers[i] && answers[i].length > 0;
              const isCurrent = i === currentQuestion;
              const isMarked = markedQuestions.has(i);
              const isCorrect = isSubmitted && correctAnswers && answers[i] && answers[i].includes(correctAnswers[i]);
              const isWrong = isSubmitted && correctAnswers && answers[i] && answers[i].length > 0 && !answers[i].includes(correctAnswers[i]);
              
              return (
                <button
                  key={i}
                  onClick={() => onQuestionSelect(i)}
                  className={`
                    h-7 w-full rounded-md transition-all text-xs font-semibold relative cursor-pointer border
                    ${isCurrent 
                      ? 'bg-emerald-500 text-primary-foreground border-emerald-555 dark:border-emerald-400 shadow-sm' 
                      : isCorrect
                        ? 'bg-emerald-500/20 text-emerald-650 dark:text-emerald-400 border-emerald-500/30'
                        : isWrong
                          ? 'bg-rose-500/20 text-rose-650 dark:text-rose-450 border-rose-500/30'
                        : isAnswered 
                          ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15' 
                          : 'bg-background text-muted-foreground border-border hover:bg-background-secondary hover:border-foreground-subtle'
                    }
                  `}
                >
                  {i + 1}
                  {isMarked && !isCurrent && !isCorrect && !isWrong && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}