'use client';

import { useState, useMemo, useEffect } from 'react';
import { PaperGrid } from '@/components/exams/PaperGrid';
import type { Paper } from '@/types/exams';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAvailablePapers } from '@/app/actions/exam';
import { accessPaper } from '@/app/actions/paper-access';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function ExamsPage() {
  const router = useRouter();
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, isSinhala } = useLanguage();

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const papers = await getAvailablePapers();
        setAllPapers(papers);
      } catch (error) {
        console.error('Failed to fetch papers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, []);

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [classCardNumber, setClassCardNumber] = useState('');

  const filteredPapers = useMemo(() => {
    const filtered = allPapers.filter(paper => {
      if (paper.type === 'specific-paper') return false;

      const matchesSubject = selectedSubject === 'all' || paper.subject === selectedSubject;
      const matchesSearch = searchQuery === '' ||
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.subject.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSubject && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.year - a.year;
      } else {
        return a.year - b.year;
      }
    });
  }, [allPapers, selectedSubject, sortOrder, searchQuery]);

  const subjects = useMemo(() => {
    const subjectSet = new Set(allPapers.map(p => p.subject));
    return Array.from(subjectSet).sort();
  }, [allPapers]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!classCardNumber.trim()) {
      toast.error(isSinhala ? 'කරුණාකර ඔබගේ පන්ති කාඩ්පත් අංකය ඇතුළත් කරන්න.' : 'Please enter your class card number.');
      return;
    }

    if (!accessCode.trim()) {
      toast.error(isSinhala ? 'කරුණාකර ප්‍රවේශ කේතය ඇතුළත් කරන්න.' : 'Please enter access code.');
      return;
    }

    try {
      const result = await accessPaper(accessCode.trim(), classCardNumber.trim());

      if (result.success && result.paperId) {
        toast.success(isSinhala ? 'ප්‍රශ්න පත්‍රය සාර්ථකව විවෘත කරන ලදී!' : 'Paper accessed successfully!');
        setAccessCode('');
        setClassCardNumber('');
        router.push(`/exams/${result.paperId}?type=tution`);
      } else {
        toast.error(result.error || (isSinhala ? 'වලංගු නොවන කේතයක්.' : 'Invalid code or access failed.'));
      }
    } catch (error) {
      console.error(error);
      toast.error(isSinhala ? 'දෝෂයක් සිදු විය.' : 'An unexpected error occurred.');
    }
  };

  return (
    <div className={cn(
      "min-h-full relative overflow-hidden bg-[#F8FAFC] dark:bg-[#080E1A] text-slate-900 dark:text-slate-100 transition-colors duration-200",
      isSinhala && "font-noto-sans-sinhala"
    )}>
      <header className="bg-white/95 dark:bg-[#0A1120]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <h1 className="text-slate-900 dark:text-white font-bold text-xl md:text-2xl tracking-tight">
                  {t.exams.title}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium hidden sm:block">
                  {t.exams.subtitle}
                </p>
              </div>
            </div>

            {/* Header Search Bar (Pill) */}
            <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md ml-auto">
              <div className="relative bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 rounded-full flex items-center shadow-xs focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950 transition-all h-9 md:h-10 px-3">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder={t.exams.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none px-2 text-xs md:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Action Banner (payments.lk highlight banner) */}
        <div className="bg-white dark:bg-[#0F172A] border-2 border-sky-400 dark:border-sky-500 rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,112,186,0.06)] dark:shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {t.exams.bannerTitle}
              </h2>
              <span className="rounded-full px-3 py-0.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                {t.exams.liveArchive}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {t.exams.bannerDesc}
            </p>
          </div>

          {/* Quick Access Form */}
          <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
            <input
              type="text"
              placeholder={t.exams.cardNoPlaceholder}
              value={classCardNumber}
              onChange={(e) => setClassCardNumber(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-400 w-full sm:w-28"
            />
            <input
              type="text"
              placeholder={t.exams.accessCodePlaceholder}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-400 w-full sm:w-32"
            />
            <button
              type="submit"
              className="rounded-full bg-[#0070BA] dark:bg-sky-500 hover:bg-[#005e9e] dark:hover:bg-sky-600 text-white px-5 py-2 font-bold text-xs shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
            >
              {t.exams.accessButton}
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSubject('all')}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                selectedSubject === 'all'
                  ? "bg-[#0070BA] dark:bg-sky-500 text-white border-transparent shadow-xs"
                  : "bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {t.exams.allSubjects}
            </button>
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                  selectedSubject === subj
                    ? "bg-[#0070BA] dark:bg-sky-500 text-white border-transparent shadow-xs"
                    : "bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {subj}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.exams.showingPapers.replace('{count}', filteredPapers.length.toString())}
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="rounded-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none cursor-pointer"
            >
              <option value="newest">{t.exams.newestFirst}</option>
              <option value="oldest">{t.exams.oldestFirst}</option>
            </select>
          </div>
        </div>

        {/* Papers Grid */}
        <PaperGrid papers={filteredPapers} />
      </main>
    </div>
  );
}