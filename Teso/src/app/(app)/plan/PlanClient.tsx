"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Calculator, FlaskConical, Atom, Map, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

const SyllabusFlowchart = dynamic(() => import('./SyllabusFlowchart'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[400px] flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
});

type Subject = 'math' | 'chemistry' | 'physics';
type View = 'flowchart' | 'past-papers' | 'generate-plan';

interface SubjectInfo {
  id: Subject;
  name: string;
  fullName: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeText: string;
}

interface PlanClientProps {
  userId: string;
}

export function PlanClient({ userId }: PlanClientProps) {
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeView, setActiveView] = useState<View>('flowchart');
  const { t, isSinhala } = useLanguage();

  const subjects: SubjectInfo[] = [
    {
      id: 'chemistry',
      name: isSinhala ? 'රසායන විද්‍යාව' : 'Chemistry',
      fullName: isSinhala ? 'අ.පො.ස. උසස් පෙළ රසායන විද්‍යාව' : 'G.C.E. Advanced Level Chemistry',
      description: t.plan.chemistryDesc,
      icon: <FlaskConical className="w-6 h-6 text-[#0070BA] dark:text-sky-400" />,
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/50',
      badgeText: t.plan.activeSubject,
    },
    {
      id: 'math',
      name: isSinhala ? 'සංයුක්ත ගණිතය' : 'Combined Mathematics',
      fullName: isSinhala ? 'සංයුක්ත ගණිතය (ශුද්ධ සහ ප්‍රායෝගික)' : 'Combined Mathematics (Pure & Applied)',
      description: t.plan.mathDesc,
      icon: <Calculator className="w-6 h-6 text-slate-500 dark:text-slate-400" />,
      iconBg: 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60',
      badgeText: t.plan.comingSoon,
    },
    {
      id: 'physics',
      name: isSinhala ? 'භෞතික විද්‍යාව' : 'Physics',
      fullName: isSinhala ? 'අ.පො.ස. උසස් පෙළ භෞතික විද්‍යාව' : 'G.C.E. Advanced Level Physics',
      description: t.plan.physicsDesc,
      icon: <Atom className="w-6 h-6 text-slate-500 dark:text-slate-400" />,
      iconBg: 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60',
      badgeText: t.plan.comingSoon,
    },
  ];

  const handleAction = (subjectId: Subject, view: View) => {
    if (subjectId === 'chemistry') {
      setActiveSubject('chemistry');
      setActiveView(view);
    } else {
      const subjectName = subjectId === 'math'
        ? (isSinhala ? 'සංයුක්ත ගණිතය' : 'Combined Mathematics')
        : (isSinhala ? 'භෞතික විද්‍යාව' : 'Physics');
      toast.info(
        isSinhala
          ? `${subjectName} අධ්‍යයන සැලසුම්කරණය ළඟදීම බලාපොරොත්තු වන්න! දැනට රසායන විද්‍යාව සක්‍රීයයි.`
          : `${subjectName} planner is coming soon! Chemistry features are fully available.`
      );
    }
  };

  if (activeSubject === 'chemistry') {
    return (
      <div className="h-full w-full bg-[#F8FAFC] dark:bg-[#080E1A] flex flex-col relative transition-colors duration-200">
        <SyllabusFlowchart
          userId={userId}
          initialView={activeView}
          onBackToSubjects={() => setActiveSubject(null)}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-full w-full bg-[#F8FAFC] dark:bg-[#080E1A] text-slate-900 dark:text-slate-100 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-10 transition-colors duration-200",
      isSinhala && "font-noto-sans-sinhala"
    )}>
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Action Banner (payments.lk highlight banner) */}
        <div className="bg-white dark:bg-[#0F172A] border-2 border-sky-400 dark:border-sky-500 rounded-2xl p-6 md:p-7 shadow-[0_2px_8px_rgba(0,112,186,0.06)] dark:shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/60 flex items-center justify-center text-[#0070BA] dark:text-sky-400 shrink-0 shadow-xs">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {t.plan.actionTitle}
                </h2>
                <span className="rounded-full px-3 py-0.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  {t.plan.actionBadge}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                {t.plan.actionDesc}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleAction('chemistry', 'flowchart')}
            className="rounded-full bg-[#0070BA] dark:bg-sky-500 hover:bg-[#005e9e] dark:hover:bg-sky-600 text-white px-6 py-2.5 font-bold text-xs md:text-sm shadow-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>{t.plan.openFlowchart}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats / Overview Sub-cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.plan.curriculumStatus}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                {t.plan.live}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isSinhala ? 'රසායන විද්‍යාව' : 'Chemistry'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.plan.curriculumDesc}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.plan.pastPaperBank}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0070BA] dark:text-sky-400 border border-sky-100 dark:border-sky-800/50">
                {t.plan.yearsCount}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">2000 – 2025</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.plan.paperCoverage}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.plan.studyEngine}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                {t.plan.automated}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isSinhala ? 'ස්වයංක්‍රීය සැලැස්ම' : 'Custom Plan'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.plan.engineDesc}</p>
            </div>
          </div>
        </div>

        {/* Subjects Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.plan.subjectOverview}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              {t.plan.subjectSubtitle}
            </p>
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjects.map((subj) => (
              <div
                key={subj.id}
                className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 md:p-7 flex flex-col justify-between transition-all duration-300 hover:border-sky-300 dark:hover:border-sky-500 hover:shadow-md shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none"
              >
                <div className="space-y-5">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${subj.iconBg}`}>
                      {subj.icon}
                    </div>
                    <span className={cn(
                      "text-xs font-semibold px-3 py-0.5 rounded-full border",
                      subj.id === 'chemistry'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                    )}>
                      {subj.badgeText}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{subj.name}</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[48px]">{subj.description}</p>
                  </div>
                </div>

                {/* Action Buttons Stack */}
                <div className="space-y-2.5 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleAction(subj.id, 'flowchart')}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer",
                      subj.id === 'chemistry'
                        ? 'bg-[#0070BA] dark:bg-sky-500 hover:bg-[#005e9e] dark:hover:bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Map className="w-3.5 h-3.5" />
                      {t.plan.viewFlowchart}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleAction(subj.id, 'past-papers')}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-[#0070BA] dark:hover:text-sky-300 hover:border-sky-200 dark:hover:border-sky-800/60 transition-all duration-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      {t.plan.pastPaperCoverage}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleAction(subj.id, 'generate-plan')}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-[#0070BA] dark:hover:text-sky-300 hover:border-sky-200 dark:hover:border-sky-800/60 transition-all duration-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {t.plan.generatePlan}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
