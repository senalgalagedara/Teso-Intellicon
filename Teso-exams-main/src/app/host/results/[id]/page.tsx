import React from 'react';
import { getPaperAnalytics } from '@/app/actions/analytics';
import { PaperAnalytics } from '@/components/host/analytics/PaperAnalytics';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Always fetch fresh data — never serve from cache
export const dynamic = 'force-dynamic';

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const analyticsData = await getPaperAnalytics(resolvedParams.id);

  if (!analyticsData) {
    return (
      <div className="min-h-full p-6 md:p-10 font-sans bg-slate-50/50 flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-black mb-2 uppercase">Analytics Not Found</h2>
          <p className="text-slate-500 font-bold mb-6">We couldn't find analytics data for Exam ID: {resolvedParams.id}</p>
          <Link
            href="/host/create"
            className="px-6 py-3 bg-black text-white font-black uppercase tracking-widest text-xs rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none inline-flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 md:p-10 font-sans bg-slate-50/50">
      <div className="max-w-[1100px] mx-auto">
        <Link
          href="/host"
          className="group flex items-center gap-2 text-black hover:text-black transition-colors px-0 font-black mb-6 w-fit"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase tracking-widest text-xs">Back to Dashboard</span>
        </Link>

        <PaperAnalytics
          paperName={analyticsData.paperName}
          totalMarks={analyticsData.totalMarks}
          scores={analyticsData.scores}
          questions={analyticsData.questions}
          studentSubmissions={analyticsData.studentSubmissions}
        />
      </div>
    </div>
  );
}
