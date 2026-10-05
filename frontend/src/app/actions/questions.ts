"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createQuestion, deleteQuestionForTeacher, QuestionOption } from "@/lib/db/questions";
import type { ActionState } from "@/app/actions/auth";

export async function createQuestionAction(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
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
    return { error: "Course, question stem, and correct option are required." };
  }

  const options: QuestionOption[] = [
    { id: "A", text: optA },
    { id: "B", text: optB },
    { id: "C", text: optC },
    { id: "D", text: optD },
  ].filter((o) => o.text.trim().length > 0);

  if (options.length < 2) {
    return { error: "At least two options (A and B) must be specified." };
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
    return { success: "Question added to bank successfully." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create question.";
    return { error: message };
  }
}

export async function deleteQuestionAction(questionId: string, courseId: string): Promise<ActionState> {
  const teacher = await requireRole("teacher");

  try {
    await deleteQuestionForTeacher(questionId, teacher.id);
    revalidatePath(`/teacher/courses/${courseId}/questions`);
    return { success: "Question deleted." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete question.";
    return { error: message };
  }
}
