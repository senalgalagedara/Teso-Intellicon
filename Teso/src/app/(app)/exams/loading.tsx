import { Skeleton } from "@/components/ui/skeleton";

export default function ExamsLoading() {
  return (
    <div className="min-h-full relative overflow-hidden bg-[#F8FAFC] dark:bg-[#080E1A] transition-colors duration-200">
      {/* Header Skeleton */}
      <header className="bg-white/95 dark:bg-[#0A1120]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-64 rounded-md opacity-75" />
            </div>
            <Skeleton className="h-10 w-48 sm:w-64 rounded-full" />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Action Banner Skeleton */}
        <div className="bg-white dark:bg-[#0F172A] border-2 border-sky-300/60 dark:border-sky-500/40 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl w-full">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-56 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-3.5 w-4/5 rounded-md opacity-75" />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>

        {/* Filter Pills Skeleton */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>

        {/* Papers Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="h-3.5 w-24 rounded-md opacity-75" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <Skeleton className="h-9 w-full rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
