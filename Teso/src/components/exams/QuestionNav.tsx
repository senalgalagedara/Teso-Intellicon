import { Grid3x3, X, Clock, CheckSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface QuestionNavProps {
  totalQuestions: number;
  currentQuestion: number;
  answers: Record<number, number>;
  markedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
  onFinishExam: () => void;
  examId: string;
  onTimeUp: () => void;
  isSubmitted?: boolean;
  isSubmitting?: boolean;
  correctAnswers?: Record<number, number>;
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
  correctAnswers
}: QuestionNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(7200); 
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
  }, [examId, isSubmitted]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;

  return (
    <>
      {/* Mobile button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-28 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-2xl flex items-center justify-center z-[60] transition-colors border-2 border-emerald-400/20"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <Grid3x3 className="w-6 h-6 text-white" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile panel */}
      <div className={`
        lg:hidden fixed bottom-0 left-0 right-0
        bg-card border-t border-border rounded-t-2xl
        transition-transform duration-300 z-50
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        shadow-[0_-8px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]
      `}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-foreground font-medium">Question Navigator</span>
            <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 text-sm font-mono">
                <Clock className="w-4 h-4" />
                {isSubmitted ? "Finished" : formatTime(timeLeft)}
            </div>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalQuestions }, (_, i) => {
                    const isAnswered = i in answers;
                    const isCurrent = i === currentQuestion;
                    const isMarked = markedQuestions.has(i);
                    const isCorrect = isSubmitted && correctAnswers && (answers[i] === correctAnswers[i]);
                    const isWrong = isSubmitted && correctAnswers && (i in answers) && (answers[i] !== correctAnswers[i]);

                    return (
                        <button
                          key={i}
                          onClick={() => { onQuestionSelect(i); setIsOpen(false); }}
                          className={`
                             h-10 w-full rounded-md text-xs font-medium relative transition-all
                             ${isCurrent 
                               ? 'bg-emerald-500 text-white font-bold ring-2 ring-emerald-400 ring-offset-2 ring-offset-background' 
                               : isCorrect
                                 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                 : isWrong
                                   ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                   : isAnswered 
                                     ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30' 
                                     : 'bg-secondary text-muted-foreground border border-border/80'
                             }
                          `}
                        >
                          {i+1}
                          {isMarked && !isCorrect && !isWrong && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                          )}
                        </button>
                    )
                })}
             </div>
             
             <div className="mt-6 pt-4 border-t border-border">
                <button
                    onClick={() => { setIsOpen(false); onFinishExam(); }}
                    disabled={isSubmitted || isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <CheckSquare className="w-4 h-4" />
                    {isSubmitted ? "Exam Finished" : isSubmitting ? "Submitting..." : "Finish Exam"}
                </button>
             </div>
          </div>
      </div>

      {/* Desktop right sidebar */}
      <div className="hidden lg:flex w-80 bg-card border-l border-border sticky top-[89px] h-[calc(100vh-89px)] flex-col transition-colors duration-300">
        <div className="p-4 border-b border-border flex-shrink-0">
          <h3 className="text-foreground mb-3 text-sm font-medium">Exam Progress</h3>
          
          <div className="mb-4 p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="tabular-nums text-3xl text-emerald-600 dark:text-emerald-400">
                {isSubmitted ? "0:00:00" : formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Answered</span>
              <span className="text-emerald-600 dark:text-emerald-400">{answeredCount}/{totalQuestions}</span>
            </div>
            <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={onFinishExam}
            disabled={isSubmitted || isSubmitting} 
            className={`w-full mt-4 px-4 py-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 text-white ${
              (isSubmitted || isSubmitting)
                ? 'bg-secondary text-muted-foreground/45 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-500/30'
            }`}
          >
             <CheckSquare className="w-4 h-4" />
             <span>{isSubmitted ? "Exam Finished" : isSubmitting ? "Submitting..." : "Finish Exam"}</span>
          </button>
        </div>

        {/* Question Grid Section */}
        <div className="p-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const isAnswered = i in answers;
              const isCurrent = i === currentQuestion;
              const isMarked = markedQuestions.has(i);
              const isCorrect = isSubmitted && correctAnswers && (answers[i] === correctAnswers[i]);
              const isWrong = isSubmitted && correctAnswers && (i in answers) && (answers[i] !== correctAnswers[i]);
              
              return (
                <button
                  key={i}
                  onClick={() => onQuestionSelect(i)}
                  className={`
                    h-7 w-full rounded-[4px] transition-all text-xs font-medium relative
                    ${isCurrent 
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-1 ring-emerald-400 shadow-md shadow-emerald-500/50' 
                      : isCorrect
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                        : isWrong
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                        : isAnswered 
                          ? 'bg-blue-600 text-white hover:bg-blue-500' 
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground border border-border/40'
                    }
                  `}
                >
                  {i + 1}
                  {isMarked && !isCurrent && !isCorrect && !isWrong && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-card" />
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