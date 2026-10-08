"use client";

import React, { useState } from 'react';
import { Check, Flag, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface Question {
  id: string | number;
  text: string;
  options: ({ text?: string | null; image?: string | null } | string)[];
  imageNote?: string | null;
  questionImage?: string | null;
  questionImages?: string[];
  answerImages?: string[];
  correctAnswer2?: number | null;
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedAnswer?: number;
  selectedAnswers?: number[];
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
  selectedAnswers,
  onAnswerSelect, 
  isMarked, 
  onToggleMark,
  isSubmitted,
  correctAnswer 
}: QuestionCardProps) {
  const optionLabels = ['A', 'B', 'C', 'D', 'E'];
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  if (!question) return null;

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 sm:p-5 shadow-md w-full max-w-2xl relative overflow-hidden transition-colors duration-200">
      
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 opacity-20" />

      {/* --- HEADER --- */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-background-secondary border border-border rounded-lg text-xs sm:text-sm text-foreground">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Question {questionNumber}
          </div>
          
          <button
            onClick={onToggleMark}
            disabled={isSubmitted}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs sm:text-sm transition-all duration-200 cursor-pointer",
              isMarked 
                ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-500" 
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-background-secondary",
              isSubmitted ? "cursor-default opacity-0 pointer-events-none" : ""
            )}
          >
            <Flag className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", isMarked && "fill-amber-500")} />
            <span>{isMarked ? "Flagged" : "Flag Question"}</span>
          </button>
        </div>
        
        {/* Question Text */}
        {question.text && (
          <h2 className="text-foreground leading-snug text-md sm:text-lg font-medium font-noto-sans-sinhala mb-3">
            {question.text}
          </h2>
        )}

        {/* Question Image(s) - Resized & Click to Zoom */}
        {question.questionImages && question.questionImages.length > 0 ? (
          <div className="space-y-4 mb-4">
            {question.questionImages.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => setZoomImage(img)}
                className="group relative rounded-xl overflow-hidden border border-border bg-background-secondary hover:border-emerald-500/30 transition-all cursor-zoom-in max-h-[200px] flex items-center justify-center max-w-sm mx-auto shadow-sm"
              >
                <ImageWithFallback 
                  src={img} 
                  alt={`Question Image ${idx + 1}`} 
                  className="w-full h-auto object-contain max-h-[200px]"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="bg-background-secondary/90 text-foreground text-[10px] px-2 py-1 rounded border border-border flex items-center gap-1 font-semibold">
                    <Maximize2 className="w-2.5 h-2.5" /> Click to Zoom
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : question.questionImage && (
          <div 
            onClick={() => setZoomImage(question.questionImage!)}
            className="group relative rounded-xl overflow-hidden border border-border bg-background-secondary hover:border-emerald-500/30 transition-all cursor-zoom-in mb-4 max-h-[200px] flex items-center justify-center max-w-sm mx-auto shadow-sm"
          >
            <ImageWithFallback 
              src={question.questionImage} 
              alt={`Question ${questionNumber}`} 
              className="w-full h-auto object-contain max-h-[200px]"
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="bg-background-secondary/90 text-foreground text-[10px] px-2 py-1 rounded border border-border flex items-center gap-1 font-semibold">
                <Maximize2 className="w-2.5 h-2.5" /> Click to Zoom
              </span>
            </div>
          </div>
        )}

        {/* Answer Image(s) - often used for additional context */}
        {question.answerImages && question.answerImages.length > 0 && (
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-1.5 mb-1 px-1">
               <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
               <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Additional Diagrams</span>
            </div>
            {question.answerImages.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => setZoomImage(img)}
                className="group relative rounded-xl overflow-hidden border border-border bg-background-secondary hover:border-emerald-500/30 transition-all cursor-zoom-in max-h-[160px] flex items-center justify-center max-w-sm mx-auto shadow-sm"
              >
                <ImageWithFallback 
                  src={img} 
                  alt={`Answer Reference ${idx + 1}`} 
                  className="w-full h-auto object-contain max-h-[160px]" 
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="bg-background-secondary/90 text-foreground text-[10px] px-2 py-1 rounded border border-border flex items-center gap-1 font-semibold">
                    <Maximize2 className="w-2.5 h-2.5" /> Click to Zoom
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- OPTIONS --- */}
      <div className="space-y-2.5">
        {question.options.map((item, index) => {
          const option = typeof item === 'string' 
              ? { text: item } 
              : item as { text?: string | null; image?: string | null };

          const isSelected = selectedAnswers 
            ? selectedAnswers.includes(index) 
            : selectedAnswer === index;

          const isCorrect = correctAnswer === index || (question.correctAnswer2 !== undefined && question.correctAnswer2 !== null && question.correctAnswer2 === index);
          
          const showCorrect = isSubmitted && isCorrect;     // Green
          const showUserChoice = isSelected;                // Blue/Neutral (User's pick)
          const isDimmed = isSubmitted && !showCorrect && !showUserChoice; // Grey out others

          return (
            <button
              key={index}
              onClick={() => !isSubmitted && onAnswerSelect(index)}
              disabled={isSubmitted}
              className={cn(
                "group w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 relative",
                
                // 1. ATTEMPT MODE (Before Submit)
                !isSubmitted && [
                  isSelected 
                    ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/5 shadow-sm" 
                    : "border-border bg-background hover:bg-background-secondary hover:border-border"
                ],

                // 2. REVIEW MODE (After Submit)
                isSubmitted && [
                  "cursor-default",
                  showCorrect 
                    ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/5 text-foreground shadow-sm" 
                    : showUserChoice 
                      ? "border-rose-500/50 bg-rose-500/10 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400" 
                      : "border-border bg-background/50 text-muted-foreground opacity-50"
                ]
              )}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox square */}
                <div className={cn(
                  "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-emerald-500 bg-emerald-500 text-primary-foreground"
                    : "border-border bg-background text-muted-foreground group-hover:border-foreground-subtle"
                )}>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                {/* Option Letter */}
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold transition-colors border",
                  
                  // Attempt Mode Icons
                  !isSubmitted && (isSelected ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-background-secondary text-muted-foreground border-border group-hover:bg-background"),
                  
                  // Review Mode Icons
                  isSubmitted && showCorrect && "bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
                  isSubmitted && showUserChoice && !showCorrect && "bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-500/40",
                  isSubmitted && isDimmed && "bg-background-secondary/30 text-muted-foreground border-border",
                )}>
                  {optionLabels[index]}
                </div>

                {/* Option Text & Image */}
                <div className="flex-1 flex flex-col gap-1.5">
                  {option.image && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid selecting the option when zooming
                        setZoomImage(option.image!);
                      }}
                      className="group/optimg relative rounded-lg overflow-hidden border border-border flex items-center justify-center bg-background-secondary cursor-zoom-in max-w-xs shadow-sm max-h-[80px]"
                    >
                      <ImageWithFallback 
                        src={option.image} 
                        alt={`Option ${optionLabels[index]}`} 
                        className="w-full h-auto object-contain max-h-[80px]" 
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/optimg:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-3 h-3 text-foreground" />
                      </div>
                    </div>
                  )}
                  {option.text && (
                    <span className="text-sm font-noto-sans-sinhala text-foreground leading-relaxed">
                      {option.text}
                    </span>
                  )}
                </div>

                {/* Labels - Stacked on mobile if needed */}
                {isSubmitted && (
                    <div className="flex gap-1.5 shrink-0">
                        {showCorrect && (
                            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                                Correct
                            </span>
                        )}
                        {showUserChoice && !showCorrect && (
                            <span className="text-[9px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 whitespace-nowrap">
                                Your Pick
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
        <div className="mt-4 p-3 bg-background-secondary rounded-xl border border-border animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex gap-2">
             <div className="w-1 h-auto bg-emerald-500 rounded-full" />
             <div>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-0.5">Explanation</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    {question.imageNote}
                </p>
             </div>
          </div>
        </div>
      )}

      {/* --- ZOOM DIALOG --- */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-3xl p-1 bg-background border border-border flex items-center justify-center rounded-xl overflow-hidden shadow-2xl">
          <DialogTitle className="sr-only">Zoomed Image View</DialogTitle>
          {zoomImage && (
            <img 
              src={zoomImage} 
              alt="Zoomed Reference View" 
              className="max-h-[75vh] max-w-full object-contain rounded-lg" 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}