import { Check, Flag, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface Question {
  id: string | number;
  text: string;
  options: ({ text?: string | null; image?: string | null } | string)[];
  imageNote?: string | null;
  questionImage?: string | null;
  questionImages?: string[];
  answerImages?: string[];
  isTuition?: boolean;
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedAnswer?: number;
  onAnswerSelect: (answerIndex: number) => void;
  isMarked?: boolean;
  onToggleMark: () => void;
  isSubmitted?: boolean;
  correctAnswer?: number;
}

export function QuestionCard({ 
  question, 
  questionNumber, 
  selectedAnswer, 
  onAnswerSelect, 
  isMarked, 
  onToggleMark,
  isSubmitted,
  correctAnswer 
}: QuestionCardProps) {
  const optionLabels = ['A', 'B', 'C', 'D', 'E'];

  if (!question) return null;

  return (
    // Theme-aware card: card background, border, dynamic shadows
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-md dark:shadow-xl w-full max-w-3xl relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 opacity-30 dark:opacity-20" />

      {/* --- HEADER --- */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted border border-border/50 rounded-lg text-xs sm:text-sm text-muted-foreground transition-colors">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Question {questionNumber}
          </div>
          
          <button
            onClick={onToggleMark}
            disabled={isSubmitted}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs sm:text-sm transition-all duration-200",
              isMarked 
                ? "bg-amber-500/10 border-amber-500/40 text-amber-500" 
                : "bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground",
              isSubmitted ? "cursor-default" : "cursor-pointer",
              isSubmitted && !isMarked && "opacity-0"
            )}
          >
            <Flag className={cn("w-3 h-3 sm:w-4 sm:h-4", isMarked && "fill-amber-500")} />
            <span>{isSubmitted && isMarked ? "Flagged" : "Not Sure"}</span>
          </button>
        </div>
        
        {/* Question Text */}
        {question.text && (
          <h2 className="text-foreground leading-relaxed text-lg sm:text-xl font-medium font-noto-sans-sinhala mb-4 transition-colors">
            {question.text}
          </h2>
        )}

        {/* Question Image(s) */}
        {question.questionImages && question.questionImages.length > 0 ? (
          <div className="space-y-6 mb-8">
            {question.questionImages.map((img, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 shadow-inner max-h-[150px] flex items-center justify-center max-w-2xl mx-auto">
                <ImageWithFallback 
                  src={img} 
                  alt={`Question Image ${idx + 1}`} 
                  className="w-full h-auto object-contain max-h-[150px]"
                />
              </div>
            ))}
          </div>
        ) : question.questionImage && (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 mb-8 shadow-inner max-h-[150px] flex items-center justify-center max-w-2xl mx-auto">
            <ImageWithFallback 
              src={question.questionImage} 
              alt={`Question ${questionNumber}`} 
              className="w-full h-auto object-contain max-h-[150px]"
            />
          </div>
        )}

        {/* Answer Image(s) */}
        {question.answerImages && question.answerImages.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-2 mb-2 px-1">
               <ImageIcon className="w-4 h-4 text-emerald-500" />
               <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Additional Diagrams</span>
            </div>
            {question.answerImages.map((img, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800/20 shadow-inner max-h-[80px] flex items-center justify-center max-w-sm mx-auto">
                <ImageWithFallback 
                  src={img} 
                  alt={`Answer Reference ${idx + 1}`} 
                  className="w-full h-auto object-contain max-h-[80px] mx-auto" 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- OPTIONS --- */}
      <div className={cn("space-y-3", question.isTuition && "grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 space-y-0")}>
        {(question.isTuition ? [0, 1, 2, 3, 4] : question.options).map((item, index) => {
          const option = (question.isTuition 
            ? (question.options[index] || {}) 
            : typeof item === 'string' 
              ? { text: item } 
              : item) as { text?: string | null; image?: string | null };

          const isSelected = selectedAnswer === index;
          const isCorrect = correctAnswer === index;
          
          const showCorrect = isSubmitted && isCorrect;
          const showUserChoice = isSelected;
          const isDimmed = isSubmitted && !showCorrect && !showUserChoice;

          return (
            <button
              key={index}
              onClick={() => !isSubmitted && onAnswerSelect(index)}
              disabled={isSubmitted}
              className={cn(
                "group w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all duration-200 relative",
                question.isTuition && "flex items-center justify-center text-center aspect-square p-2",
                
                // 1. ATTEMPT MODE (Before Submit)
                !isSubmitted && [
                  isSelected 
                    ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" 
                    : "border-border bg-secondary/30 dark:bg-secondary/10 hover:bg-secondary/60 dark:hover:bg-secondary/25 hover:border-border/80"
                ],

                // 2. REVIEW MODE (After Submit)
                isSubmitted && [
                  "cursor-default",
                  showCorrect 
                    ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30 z-10 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : showUserChoice 
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                      : "border-border/30 bg-secondary/10 text-muted-foreground/30 opacity-50"
                ]
              )}
            >
              <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4", question.isTuition && "flex-col items-center justify-center gap-1 sm:gap-2")}>
                {/* Option Letter / Icon */}
                <div className={cn(
                  "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors mt-0.5 sm:mt-0",
                  
                  // Attempt Mode Icons
                  !isSubmitted && (isSelected ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/85"),
                  
                  // Review Mode Icons
                  isSubmitted && showCorrect && "bg-emerald-500 text-white",
                  isSubmitted && showUserChoice && !showCorrect && "bg-rose-500 text-white",
                  isSubmitted && isDimmed && "bg-muted/50 text-muted-foreground/50",
                  question.isTuition && "w-6 h-6 sm:w-7 sm:h-7 text-xs"
                )}>
                  {showCorrect ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : optionLabels[index]}
                </div>

                {/* Option Text & Image */}
                <div className={cn(
                  "flex-1 flex flex-col gap-2 pt-1 sm:pt-0",
                  question.isTuition && "items-center text-center pt-0",
                  question.isTuition && !option.text && !option.image && "hidden"
                )}>
                  {option.image && (
                    <div className={cn(
                        "rounded-lg overflow-hidden border border-border/50 min-h-[40px] flex items-center justify-center bg-muted/30",
                        question.isTuition ? "max-w-full" : "max-w-[200px]"
                    )}>
                      <ImageWithFallback 
                        src={option.image} 
                        alt={`Option ${optionLabels[index]}`} 
                        className="w-full h-auto object-contain max-h-[120px]" 
                      />
                    </div>
                  )}
                  {option.text && (
                    <span className={cn(
                        "text-sm font-noto-sans-sinhala text-foreground",
                        question.isTuition && "text-xs sm:text-sm"
                    )}>
                      {option.text}
                    </span>
                  )}
                </div>

                {/* Labels */}
                {isSubmitted && !question.isTuition && (
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        {showCorrect && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 whitespace-nowrap text-center">
                                Correct
                            </span>
                        )}
                        {showUserChoice && !showCorrect && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 whitespace-nowrap text-center">
                                Your Answer
                            </span>
                        )}
                    </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* --- EXPLANATION (Only on Review) --- */}
      {isSubmitted && question.imageNote && (
        <div className="mt-6 p-4 bg-muted/40 rounded-xl border border-border animate-in fade-in slide-in-from-top-2 duration-500 transition-colors">
          <div className="flex gap-3">
             <div className="w-1 h-auto bg-emerald-500 rounded-full" />
             <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">Explanation</p>
                <p className="text-foreground text-sm leading-relaxed font-noto-sans-sinhala">
                    {question.imageNote}
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}