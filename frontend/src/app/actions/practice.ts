"use server";

import { requireRole } from "@/lib/auth/guards";
import { query } from "@/lib/db/client";
import {
  getQuestionForStudent,
  getQuestionAnswerDetails,
  recordQuestionServe,
  recordAttemptInDb,
  PublicQuestion
} from "@/lib/db/questions";
import { engineClient } from "@/lib/engine/client";

export type NextQuestionActionResult =
  | {
      ok: true;
      serveId: string;
      question: PublicQuestion;
      reason: string;
    }
  | { ok: false; error: string };

export async function getNextQuestionAction(courseId: string): Promise<NextQuestionActionResult> {
  const student = await requireRole("student");

  // Verify accepted enrollment in this course
  const enrollments = await query<{ id: string }>`
    SELECT id FROM app.enrollments
    WHERE course_id = ${courseId} AND student_id = ${student.id} AND status = 'accepted'
    LIMIT 1
  `;

  if (enrollments.length === 0) {
    return { ok: false, error: "ඔබ මෙම පාඨමාලාවට ලියාපදිංචි වී නොමැත." };
  }

  try {
    // 1. Request engine recommendation
    const nextQ = await engineClient.getNextQuestion(student.id, courseId);

    // 2. Load question for student (without correct_option or explanation)
    const question = await getQuestionForStudent(nextQ.question_id);
    if (!question) {
      return { ok: false, error: "නිර්දේශිත ප්‍රශ්නය මෙම අවස්ථාවේ ලබාගත නොහැක." };
    }

    // 3. Record serve timestamp in app.question_serves for server-side latency calculation
    const serveId = await recordQuestionServe(student.id, question.id, courseId, "practice");

    return {
      ok: true,
      serveId,
      question,
      reason: nextQ.reason,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "මීළඟ ප්‍රශ්නය පූරණය කිරීමට නොහැකි විය.";
    return { ok: false, error: message };
  }
}

export type SubmitAnswerActionResult =
  | {
      ok: true;
      is_correct: boolean;
      correct_option: string;
      explanation: string | null;
      diagnosis?: {
        label: string;
        p_mastery: number;
        next_due_at: string | null;
      };
    }
  | { ok: false; error: string };

export async function submitAnswerAction(params: {
  attemptId: string;
  serveId: string;
  chosenOption: string;
}): Promise<SubmitAnswerActionResult> {
  const student = await requireRole("student");

  // 1. Record attempt in DB (calculates latency and correctness server-side)
  const attempt = await recordAttemptInDb(
    params.attemptId,
    params.serveId,
    student.id,
    params.chosenOption
  );

  if (!attempt) {
    return { ok: false, error: "උත්සාහය දැනටමත් ඉදිරිපත් කර ඇත හෝ සැසිය වලංගු නොවේ." };
  }

  // 2. Retrieve official answer and explanation to reveal to the student
  const details = await getQuestionAnswerDetails(attempt.question_id);
  if (!details) {
    return { ok: false, error: "ප්‍රශ්නයේ පිළිතුරු දත්ත අස්ථානගත වී ඇත." };
  }

  // 3. Inform the engine to update Rasch ability, BKT, FSRS, and diagnosis with graceful degradation
  let diagnosisData: { label: string; p_mastery: number; next_due_at: string | null } | undefined;

  try {
    const processPromise = engineClient.processAttempt(attempt.id);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Engine timeout")), 3000)
    );

    const diag = await Promise.race([processPromise, timeoutPromise]);
    diagnosisData = {
      label: diag.label,
      p_mastery: diag.p_mastery,
      next_due_at: diag.next_due_at,
    };
  } catch (err) {
    // Attempt is safely recorded in app.attempts; lazy catch-up will process on the next session
    console.warn("Engine attempt processing deferred or timed out:", err);
  }

  return {
    ok: true,
    is_correct: attempt.is_correct,
    correct_option: details.correct_option,
    explanation: details.explanation,
    diagnosis: diagnosisData,
  };
}
