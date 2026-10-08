"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  FolderOpen,
  Calendar,
  Clock,
  BookOpen,
  Trash2,
  Loader2,
  ArrowRight,
  Sparkles,
  CalendarDays,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getUserPlans,
  getPlanById,
  deletePlan,
  type PlanListItem,
  type PlanResult,
  type PlanInput,
} from "@/app/actions/study-plan-actions";

interface LoadPlanDialogProps {
  userId: string;
  onPlanLoaded: (plan: PlanResult, input: PlanInput) => void;
  trigger?: React.ReactNode;
}

export function LoadPlanDialog({
  userId,
  onPlanLoaded,
  trigger,
}: LoadPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [cachedPlan, setCachedPlan] = useState<{ plan: PlanResult; input: PlanInput } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load plans list when dialog opens
  useEffect(() => {
    if (!open) return;

    // Check localStorage cached plan
    try {
      const cached = localStorage.getItem("teso_cached_plan");
      if (cached) {
        setCachedPlan(JSON.parse(cached));
      }
    } catch {
      // ignore
    }

    fetchPlans();
  }, [open, userId]);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getUserPlans(userId);
      setPlans(list || []);
    } catch (err: unknown) {
      console.warn("Could not fetch user plans from API:", err);
      setError("Could not connect to plans server. You can still load locally cached plans if available.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    setLoadingPlanId(planId);
    try {
      const fullPlan = await getPlanById(planId);
      const planInput: PlanInput = {
        user_id: fullPlan.user_id || userId,
        months: fullPlan.months,
        hours_per_day: fullPlan.hours_per_day,
        off_days: fullPlan.off_days,
        skipped_lesson_ids: [],
      };

      // Cache as latest loaded plan
      try {
        localStorage.setItem("teso_cached_plan", JSON.stringify({ plan: fullPlan, input: planInput }));
      } catch {
        // ignore
      }

      onPlanLoaded(fullPlan, planInput);
      toast.success("Study plan loaded successfully!");
      setOpen(false);
    } catch (err: unknown) {
      console.error("Failed to load plan:", err);
      toast.error("Failed to load plan details. Please try again.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleLoadCached = () => {
    if (!cachedPlan) return;
    onPlanLoaded(cachedPlan.plan, cachedPlan.input);
    toast.success("Cached study plan loaded successfully!");
    setOpen(false);
  };

  const handleDeletePlan = (planId: string) => {
    setDeletingPlanId(planId);
    startTransition(async () => {
      try {
        await deletePlan(planId, userId);
        setPlans((prev) => prev.filter((p) => p.plan_id !== planId));
        toast.success("Study plan deleted.");
      } catch (err) {
        console.error("Failed to delete plan:", err);
        toast.error("Failed to delete plan.");
      } finally {
        setDeletingPlanId(null);
      }
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recent Plan";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all duration-200 text-xs font-semibold border border-blue-200 shadow-xs cursor-pointer"
            title="Load Saved Study Plan"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Load Plan</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[85vh] bg-white border border-slate-200 text-slate-900 shadow-2xl rounded-2xl p-6 flex flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Saved Study Plans
            </DialogTitle>
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh plans"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <DialogDescription className="text-slate-500 text-xs mt-1">
            Load an existing study plan to view your daily schedule and keep tracking progress.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {/* Loading indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Fetching your saved plans...</p>
            </div>
          )}

          {/* Error Notice */}
          {!loading && error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Cached Local Plan option */}
          {!loading && cachedPlan && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Recent Session
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {cachedPlan.plan.months} Months · {cachedPlan.plan.hours_per_day}h/day
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate">
                  Latest Generated Plan ({cachedPlan.plan.total_days} Days · {cachedPlan.plan.lessons_in_plan.length} Lessons)
                </p>
              </div>
              <Button
                onClick={handleLoadCached}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <span>Load Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Saved Plans List */}
          {!loading && plans.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                All Saved Plans ({plans.length})
              </p>
              {plans.map((p) => {
                const isLoadingThis = loadingPlanId === p.plan_id;
                const isDeletingThis = deletingPlanId === p.plan_id;

                return (
                  <div
                    key={p.plan_id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {p.months} Month Study Plan
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                          {formatDate(p.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          {p.total_days} Days
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          {p.hours_per_day}h/day ({p.total_hours.toFixed(0)}h total)
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          {p.lessons_count} Lessons
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => handleSelectPlan(p.plan_id)}
                        disabled={isLoadingThis || isDeletingThis}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1.5"
                      >
                        {isLoadingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>

                      <button
                        onClick={() => handleDeletePlan(p.plan_id)}
                        disabled={isLoadingThis || isDeletingThis}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Plan"
                      >
                        {isDeletingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && plans.length === 0 && !cachedPlan && (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">No saved plans found</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  You haven&apos;t saved any study plans yet. Click &quot;Generate Plan&quot; to create your first customized study roadmap!
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
