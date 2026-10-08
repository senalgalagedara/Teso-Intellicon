"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Sparkles, Calendar, Clock, Coffee, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generatePlan, type PlanInput, type PlanResult } from "@/app/actions/study-plan-actions";

interface PlanInputDialogProps {
  userId: string;
  skippedLessonIds?: number[];
  onPlanGenerated?: (plan: PlanResult, input: PlanInput) => void;
  onPlanSaved?: (planId: string) => void;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function PlanInputDialog({
  userId,
  skippedLessonIds = [],
  onPlanGenerated,
  trigger,
  defaultOpen = false,
}: PlanInputDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [months, setMonths] = useState(3);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [offDays, setOffDays] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    const input: PlanInput = {
      user_id: userId,
      months,
      hours_per_day: hoursPerDay,
      off_days: offDays,
      skipped_lesson_ids: skippedLessonIds,
    };

    startTransition(async () => {
      try {
        const plan = await generatePlan(input);
        try {
          localStorage.setItem("teso_cached_plan", JSON.stringify({ plan, input }));
        } catch {
          // ignore
        }
        if (onPlanGenerated) {
          onPlanGenerated(plan, input);
        }
        setOpen(false);
      } catch (err: any) {
        console.error("Failed to generate plan:", err);
        setError(err.message || "An unexpected error occurred while generating the plan.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[480px] bg-white border border-slate-200 text-slate-900 shadow-xl overflow-hidden rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            Generate Custom Study Plan
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs mt-1">
            Set your duration and daily schedule to generate a personalized timeline.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-6 py-2">
          {/* Target Duration slider */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="flex items-center gap-2 text-slate-800">
                <Calendar className="w-4 h-4 text-blue-600" />
                Target Duration
              </span>
              <span className="text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {months} {months === 1 ? "Month" : "Months"}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              disabled={isPending}
              className="w-full h-2 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-colors"
            />
            <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
              <span>1 Month</span>
              <span>6 Months</span>
              <span>12 Months</span>
            </div>
          </div>

          {/* Daily Study Hours slider */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="flex items-center gap-2 text-slate-800">
                <Clock className="w-4 h-4 text-blue-600" />
                Study Time (Daily)
              </span>
              <span className="text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {hoursPerDay} {hoursPerDay === 1 ? "Hour" : "Hours"}/day
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseInt(e.target.value))}
              disabled={isPending}
              className="w-full h-2 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-colors"
            />
            <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
              <span>1 Hour</span>
              <span>6 Hours</span>
              <span>12 Hours</span>
            </div>
          </div>

          {/* Weekly Off Days slider */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="flex items-center gap-2 text-slate-800">
                <Coffee className="w-4 h-4 text-blue-600" />
                Rest Days
              </span>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {offDays === 0 ? "No off days" : `${offDays} ${offDays === 1 ? "Day" : "Days"}/week`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="1"
              value={offDays}
              onChange={(e) => setOffDays(parseInt(e.target.value))}
              disabled={isPending}
              className="w-full h-2 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 hover:accent-emerald-700 transition-colors"
            />
            <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
              <span>No off days</span>
              <span>1 Day</span>
              <span>2 Days</span>
              <span>3 Days</span>
            </div>
          </div>

          {/* Mastery/Skip Info Card */}
          {skippedLessonIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-900">Smart Customization</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                  Skipping <strong className="text-amber-900">{skippedLessonIds.length}</strong> lesson(s) marked as already mastered.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons footer */}
        <DialogFooter className="flex gap-3 mt-4 pt-4 border-t border-slate-100 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                Generate Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
