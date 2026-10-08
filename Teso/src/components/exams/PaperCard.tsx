'use client';

import { Star } from 'lucide-react';
import type { Paper } from '@/types/exams';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
  const router = useRouter();
  const { t, isSinhala } = useLanguage();

  const label = paper.type === 'past-paper' ? t.exams.pastPaper : t.exams.specificPaper;

  const handleAttemptPaper = () => {
    router.push(`/exams/${paper.id}`);
  };

  return (
    <div className={cn(
      "relative group h-full",
      isSinhala && "font-noto-sans-sinhala"
    )}>
      {/* Main card */}
      <div className="relative bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
        
        {/* Header section - Paper name, year, and tag */}
        <div className="relative mb-5 flex-grow">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/50 text-[#0070BA] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
              {label}
            </span>
            {paper.year === new Date().getFullYear() && (
              <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                <Star className="w-3 h-3 fill-current" />
                <span>{t.exams.newBadge}</span>
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {paper.subject} <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">({paper.year})</span>
          </h3>
          {paper.term && (
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              {paper.term}
            </p>
          )}

          {/* Sub-card metadata tile */}
          <div className="mt-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{t.exams.paperStatus}</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200/60 dark:border-emerald-800/50">
              {t.exams.readyToAttempt}
            </span>
          </div>
        </div>

        {/* Attempt button */}
        <button 
          onClick={handleAttemptPaper}
          className="w-full bg-[#0070BA] dark:bg-sky-500 hover:bg-[#005e9e] dark:hover:bg-sky-600 text-white py-2.5 rounded-full flex items-center justify-center gap-2 transition-all duration-200 shadow-xs font-bold text-xs cursor-pointer mt-auto"
        >
          <span>{t.exams.attemptPaper}</span>
        </button>
      </div>
    </div>
  );
}
