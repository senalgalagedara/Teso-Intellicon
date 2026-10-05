"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createQuestion, deleteQuestionForTeacher, QuestionOption } from "@/lib/db/questions";

export async function createQuestionAction(formData: FormData) {
  const teacher = await requireRole("teacher");

  const courseId = formData.get("course_id") as string;
  const stem = formData.get("stem") as string;
  const correctOption = formData.get("correct_option") as string;
  const explanation = (formData.get("explanation") as string) || "";
  const difficulty = parseInt((formData.get("teacher_difficulty") as string) || "2", 10);

  const optA = (formData.get("option_a") as string) || "";
  const optB = (formData.get("option_b") as string) || "";
  const optC = (formData.get("option_c") as string) || "";
  const optD = (formData.get("option_d") as string) || "";

  if (!courseId || !stem || !correctOption) {
    return { ok: false, error: "Course, question stem, and correct option are required." };
  }

  const options: QuestionOption[] = [
    { id: "A", text: optA },
    { id: "B", text: optB },
    { id: "C", text: optC },
    { id: "D", text: optD },
  ].filter((o) => o.text.trim().length > 0);

  if (options.length < 2) {
    return { ok: false, error: "At least two options (A and B) must be specified." };
  }

  try {
    await createQuestion({
      teacherId: teacher.id,
      courseId,
      stem: stem.trim(),
      options,
      correctOption: correctOption.toUpperCase().trim(),
      explanation: explanation.trim(),
      teacherDifficulty: Math.min(3, Math.max(1, difficulty)),
    });

    revalidatePath(`/teacher/courses/${courseId}/questions`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create question.";
    return { ok: false, error: message };
  }
}

export async function deleteQuestionAction(questionId: string, courseId: string) {
  const teacher = await requireRole("teacher");

  try {
    await deleteQuestionForTeacher(questionId, teacher.id);
    revalidatePath(`/teacher/courses/${courseId}/questions`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete question.";
    return { ok: false, error: message };
  }
}
