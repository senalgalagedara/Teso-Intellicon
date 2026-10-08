"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  BookOpen,
  ClipboardList,
  FileText,
  CheckCircle2,
  Clock,
  Trophy,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Circle,
  TrendingUp,
} from "lucide-react";
import { updateDayProgress, type DayPlan, type DayProgressRecord } from "@/app/actions/study-plan-actions";
import { getSubLessonLabel, UNIT_LABELS } from "@/lib/chemistry-lessons";

interface DailyPlanViewProps {
  days: DayPlan[];
  planId: string;
  userId: string;
  initialProgress?: DayProgressRecord[];
}

export function DailyPlanView({
  days,
  planId,
  userId,
  initialProgress = [],
}: DailyPlanViewProps) {
  // Store progress in a map: dayNumber -> DayProgressRecord
  const [progressMap, setProgressMap] = useState<Record<number, DayProgressRecord>>(() => {
    const map: Record<number, DayProgressRecord> = {};
    initialProgress.forEach((rec) => {
      map[rec.dayNumber] = rec;
    });
    return map;
  });

  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const toggleExpand = (dayNum: number) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  // Toggle a single task (lesson, MCQ, Part 2)
  const handleToggleTask = (dayNum: number, field: "lesson" | "mcq" | "p2") => {
    const existing = progressMap[dayNum] ?? {
      lessonDone: false,
      mcqDone: false,
      p2Done: false,
    };

    const updates: Record<string, boolean> = {};
    if (field === "lesson") updates.lessonDone = !existing.lessonDone;
    if (field === "mcq") updates.mcqDone = !existing.mcqDone;
    if (field === "p2") updates.p2Done = !existing.p2Done;

    startTransition(async () => {
      try {
        const updatedRecord = await updateDayProgress(planId, userId, dayNum, updates);
        setProgressMap((prev) => ({
          ...prev,
          [dayNum]: updatedRecord,
        }));
      } catch (err) {
        console.error("Failed to update task progress:", err);
      }
    });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let completedDays = 0;

    days.forEach((day) => {
      const prog = progressMap[day.day] ?? {
        lessonDone: false,
        mcqDone: false,
        p2Done: false,
        dayCompleted: false,
      };

      // Each day potentially has 3 tasks: Lesson, MCQ, Part 2
      const tasks = [
        { active: day.lesson_id != null, done: prog.lessonDone },
        { active: day.mcq_unit != null, done: prog.mcqDone },
        { active: day.p2_unit != null, done: prog.p2Done },
      ];

      tasks.forEach((t) => {
        if (t.active) {
          totalTasks++;
          if (t.done) completedTasks++;
        }
      });

      if (prog.dayCompleted || (prog.lessonDone && prog.mcqDone && prog.p2Done)) {
        completedDays++;
      }
    });

    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
      totalTasks,
      completedTasks,
      completedDays,
      percent,
    };
  }, [days, progressMap]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white text-slate-900">
      {/* Premium Statistics Banner */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-4 relative">
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Progress</span>
            <span className="text-sm font-bold text-blue-600">{stats.percent}% Completed</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500 rounded-full"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-6 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{stats.completedDays} / {days.length}</div>
              <div className="text-[10px] text-slate-500 font-medium">Days Done</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{stats.completedTasks} / {stats.totalTasks}</div>
              <div className="text-[10px] text-slate-500 font-medium">Tasks Done</div>
            </div>
          </div>
        </div>
      </div>

      {/* Days List */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-slate-50/40">
        {days.map((day) => {
          const prog = progressMap[day.day] ?? {
            lessonDone: false,
            mcqDone: false,
            p2Done: false,
            dayCompleted: false,
          };

          const isExpanded = expandedDays[day.day] ?? false;
          const dayCompleted = prog.lessonDone && prog.mcqDone && prog.p2Done;

          const lessonLabel = day.lesson_id != null ? getSubLessonLabel(day.lesson_id) : null;
          const unitLabel = day.lesson_unit != null ? (UNIT_LABELS[day.lesson_unit] ?? `Unit ${day.lesson_unit}`) : null;
          const mcqUnitLabel = day.mcq_unit != null ? (UNIT_LABELS[day.mcq_unit] ?? `Unit ${day.mcq_unit}`) : null;
          const p2UnitLabel = day.p2_unit != null ? (UNIT_LABELS[day.p2_unit] ?? `Unit ${day.p2_unit}`) : null;

          return (
            <div
              key={day.day}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                dayCompleted
                  ? "border-emerald-300 bg-emerald-50/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {/* Day Card Header */}
              <div
                onClick={() => toggleExpand(day.day)}
                className={`px-5 py-4 flex items-center gap-4 cursor-pointer select-none border-b transition-colors ${
                  dayCompleted ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50/70"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                    dayCompleted
                      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                      : "bg-blue-50 border-blue-200 text-blue-600 font-bold"
                  }`}
                >
                  {dayCompleted ? <Trophy className="w-4 h-4 text-emerald-600" /> : <span className="text-xs font-bold text-blue-600">{day.day}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${dayCompleted ? "text-emerald-700" : "text-slate-900"}`}>
                      Day {day.day}
                    </span>
                    {dayCompleted && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Complete
                      </span>
                    )}
                  </div>
                  {lessonLabel ? (
                    <p className="text-[17px] text-slate-700 truncate mt-0.5 font-medium font-noto-sans-sinhala leading-snug">
                      Lesson {day.lesson_id} · {lessonLabel}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Free / Review Day</p>
                  )}
                </div>

                {/* Status indicator icons */}
                <div className="hidden sm:flex items-center gap-2">
                  {day.lesson_id != null && (
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${prog.lessonDone ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-blue-600"}`}>
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {day.mcq_unit != null && (
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${prog.mcqDone ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-blue-600"}`}>
                      <ClipboardList className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {day.p2_unit != null && (
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${prog.p2Done ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-blue-600"}`}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-2 shrink-0">
                  {day.total_day_time > 0 && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {day.total_day_time.toFixed(1)}h
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Day Card Tasks Section */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Lesson Task */}
                  {day.lesson_id != null && (
                    <div
                      onClick={() => handleToggleTask(day.day, "lesson")}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        prog.lessonDone
                          ? "border-emerald-200 bg-emerald-50/50 text-slate-900"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          Study Lesson
                        </span>
                        {prog.lessonDone ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 text-slate-300 hover:text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold leading-snug line-clamp-2 text-slate-900 font-noto-sans-sinhala">{lessonLabel}</p>
                        <div className="flex flex-wrap items-center gap-x-3 mt-2 text-[14px] text-slate-600 font-medium font-noto-sans-sinhala">
                          {unitLabel && <span className="truncate max-w-[140px]">{unitLabel}</span>}
                          {day.lesson_time_cost != null && (
                            <span className="flex items-center gap-1 shrink-0 font-sans text-xs text-slate-500"><Clock className="w-3 h-3 text-blue-600" />{day.lesson_time_cost.toFixed(1)}h</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MCQ Practice Task */}
                  {day.mcq_unit != null && (
                    <div
                      onClick={() => handleToggleTask(day.day, "mcq")}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        prog.mcqDone
                          ? "border-emerald-200 bg-emerald-50/50 text-slate-900"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          MCQ Practice
                        </span>
                        {prog.mcqDone ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 text-slate-300 hover:text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold leading-snug line-clamp-2 text-slate-900 font-noto-sans-sinhala">{mcqUnitLabel}</p>
                        <div className="flex gap-3 mt-2 text-xs text-slate-500 font-medium font-sans">
                          <span>Practice Test</span>
                          {day.mcq_time_cost != null && (
                            <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3 text-blue-600" />{day.mcq_time_cost.toFixed(1)}h</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Part 2 Paper Task */}
                  {day.p2_unit != null && (
                    <div
                      onClick={() => handleToggleTask(day.day, "p2")}
                      className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        prog.p2Done
                          ? "border-emerald-200 bg-emerald-50/50 text-slate-900"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          Part 2 Written
                        </span>
                        {prog.p2Done ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 text-slate-300 hover:text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold leading-snug line-clamp-2 text-slate-900 font-noto-sans-sinhala">{p2UnitLabel}</p>
                        <div className="flex gap-3 mt-2 text-xs text-slate-500 font-medium font-sans">
                          <span>Structure & Essay</span>
                          {day.p2_time_cost != null && (
                            <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3 text-blue-600" />{day.p2_time_cost.toFixed(1)}h</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If rest day / review day */}
                  {day.lesson_id == null && day.mcq_unit == null && day.p2_unit == null && (
                    <div className="col-span-3 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-slate-500 text-xs">
                      No tasks scheduled for today. Spend some time reviewing previous material or rest.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
