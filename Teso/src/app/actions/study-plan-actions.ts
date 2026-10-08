"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const TESO_API_BASE = process.env.TESO_API_URL ?? "http://localhost:8000";

export interface PlanInput {
  user_id: string;
  months: number;
  hours_per_day: number;
  off_days: number;
  skipped_lesson_ids: number[];
}

export interface DayPlan {
  day: number;
  lesson_unit: number | null;
  lesson_id: number | null;
  lesson_time_cost: number | null;
  mcq_unit: number | null;
  mcq_id: number | null;
  mcq_time_cost: number | null;
  p2_unit: number | null;
  p2_id: number | null;
  p2_time_cost: number | null;
  total_day_time: number;
}

export interface LessonItem {
  unit: number;
  id: number;
  est_time: number;
  lesson_time: number;
  syllabus_p: number;
  total_syl: number;
  mcq: number;
  mcq_wt: number;
  mcq_time: number;
  part_wt: number;
  p2_time: number;
  total_time_cost: number;
}

export interface PlanResult {
  plan_id?: string;
  user_id: string;
  months: number;
  hours_per_day: number;
  off_days: number;
  total_days: number;
  total_hours: number;
  lessons_in_plan: LessonItem[];
  daily_plan: DayPlan[];
  created_at?: string;
}

export interface SavedPlanResponse {
  plan_id: string;
  message: string;
  created_at: string;
}

export interface PlanListItem {
  plan_id: string;
  months: number;
  hours_per_day: number;
  off_days: number;
  total_days: number;
  total_hours: number;
  lessons_count: number;
  created_at: string;
}

/** Preview plan without saving */
export async function generatePlan(input: PlanInput): Promise<PlanResult> {
  const res = await fetch(`${TESO_API_BASE}/study-plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to generate plan: ${err}`);
  }
  return res.json();
}

/** Generate and save plan to DB */
export async function saveStudyPlan(input: PlanInput): Promise<SavedPlanResponse> {
  const res = await fetch(`${TESO_API_BASE}/study-plan/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to save plan: ${err}`);
  }
  return res.json();
}

/** Get all plans for a user */
export async function getUserPlans(userId: string): Promise<PlanListItem[]> {
  const res = await fetch(`${TESO_API_BASE}/study-plan/user/${userId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

/** Get a specific plan by ID */
export async function getPlanById(planId: string): Promise<PlanResult> {
  const res = await fetch(`${TESO_API_BASE}/study-plan/${planId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Plan not found");
  return res.json();
}

/** Delete a plan */
export async function deletePlan(planId: string, userId: string): Promise<void> {
  const res = await fetch(
    `${TESO_API_BASE}/study-plan/${planId}?user_id=${userId}`,
    { method: "DELETE", cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to delete plan");
}

export interface DayProgressRecord {
  id: string;
  planId: string;
  userId: string;
  dayNumber: number;
  lessonDone: boolean;
  mcqDone: boolean;
  p2Done: boolean;
  dayCompleted: boolean;
  completedAt: string | null;
  timeSpentLesson: number | null;
  timeSpentMcq: number | null;
  timeSpentP2: number | null;
}

/** Upsert progress for a single day (lesson / mcq / p2). */
export async function updateDayProgress(
  planId: string,
  userId: string,
  dayNumber: number,
  updates: {
    lessonDone?: boolean;
    mcqDone?: boolean;
    p2Done?: boolean;
    timeSpentLesson?: number;
    timeSpentMcq?: number;
    timeSpentP2?: number;
  }
): Promise<DayProgressRecord> {
  const existing = await prisma.studyDayProgress.findUnique({
    where: { planId_dayNumber: { planId, dayNumber } },
  });

  const lessonDone =
    updates.lessonDone !== undefined
      ? updates.lessonDone
      : (existing?.lessonDone ?? false);
  const mcqDone =
    updates.mcqDone !== undefined
      ? updates.mcqDone
      : (existing?.mcqDone ?? false);
  const p2Done =
    updates.p2Done !== undefined
      ? updates.p2Done
      : (existing?.p2Done ?? false);

  const dayCompleted = lessonDone && mcqDone && p2Done;
  const completedAt = dayCompleted
    ? existing?.completedAt ?? new Date()
    : null;

  const timeSpentLesson = updates.timeSpentLesson !== undefined ? updates.timeSpentLesson : (existing?.timeSpentLesson ?? null);
  const timeSpentMcq = updates.timeSpentMcq !== undefined ? updates.timeSpentMcq : (existing?.timeSpentMcq ?? null);
  const timeSpentP2 = updates.timeSpentP2 !== undefined ? updates.timeSpentP2 : (existing?.timeSpentP2 ?? null);

  const record = await prisma.studyDayProgress.upsert({
    where: { planId_dayNumber: { planId, dayNumber } },
    create: {
      planId,
      userId,
      dayNumber,
      lessonDone,
      mcqDone,
      p2Done,
      timeSpentLesson,
      timeSpentMcq,
      timeSpentP2,
      dayCompleted,
      completedAt,
    },
    update: {
      lessonDone,
      mcqDone,
      p2Done,
      timeSpentLesson,
      timeSpentMcq,
      timeSpentP2,
      dayCompleted,
      completedAt,
    },
  });

  revalidatePath("/plan");

  return {
    ...record,
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}

/** Get all day-progress records for a given plan. */
export async function getPlanProgress(
  planId: string
): Promise<DayProgressRecord[]> {
  const rows = await prisma.studyDayProgress.findMany({
    where: { planId },
    orderBy: { dayNumber: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

/** Get a summary: how many days are fully completed out of total. */
export async function getPlanProgressSummary(planId: string) {
  const rows = await prisma.studyDayProgress.findMany({
    where: { planId },
  });
  const completed = rows.filter((r) => r.dayCompleted).length;
  return { completed, total: rows.length };
}
