"use client";

import React from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, setLanguage, isSinhala } = useLanguage();

  return (
    <div className="flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer",
          language === 'en'
            ? "bg-white dark:bg-slate-900 text-[#0070BA] dark:text-sky-400 shadow-xs"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        )}
        title="English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('si')}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer font-noto-sans-sinhala",
          language === 'si'
            ? "bg-white dark:bg-slate-900 text-[#0070BA] dark:text-sky-400 shadow-xs"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        )}
        title="සිංහල"
      >
        සිංහල
      </button>
    </div>
  );
}
