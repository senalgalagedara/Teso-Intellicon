import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full w-full bg-[#F8FAFC] dark:bg-[#080E1A] flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
        
        {/* Action Banner Skeleton */}
        <div className="bg-white dark:bg-[#0F172A] border-2 border-sky-300/60 dark:border-sky-500/40 rounded-2xl p-6 md:p-7 shadow-[0_2px_8px_rgba(0,112,186,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 w-full md:w-auto">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-2.5 w-full">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-52 sm:w-64 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-xl rounded-md" />
              <Skeleton className="h-3.5 w-3/4 max-w-md rounded-md opacity-70" />
            </div>
          </div>
          <Skeleton className="h-10 w-44 sm:w-48 rounded-full shrink-0" />
        </div>

        {/* 3 Metric Sub-cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-7 w-32 rounded-lg" />
                <Skeleton className="h-3.5 w-44 rounded-md opacity-80" />
              </div>
            </div>
          ))}
        </div>

        {/* Section Heading Skeleton */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-6 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 sm:w-96 rounded-md opacity-80" />
        </div>

        {/* 3 Main Grid Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 md:p-7 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36 rounded-lg" />
                  <Skeleton className="h-3.5 w-full rounded-md opacity-75" />
                  <Skeleton className="h-3.5 w-4/5 rounded-md opacity-75" />
                </div>
              </div>

              {/* 3 Action Buttons Skeleton */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <Skeleton className="h-9 w-full rounded-full" />
                <Skeleton className="h-9 w-full rounded-full opacity-80" />
                <Skeleton className="h-9 w-full rounded-full opacity-80" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
