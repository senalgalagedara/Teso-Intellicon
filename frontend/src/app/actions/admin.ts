"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/dal";
import {
  createAdminSubject,
  deleteAdminSubject,
  createAdminQuestion,
  deleteAdminQuestion,
  batchApproveAndCreateAdminQuestions,
  BatchQuestionInput,
  syncLeaderboardFromSessions,
} from "@/lib/db/admin";
import { reviewTeacherRequest } from "@/lib/db/queries";
import type { ActionState } from "@/app/actions/auth";
import type { TeacherRequestStatus } from "@/lib/auth/roles";
import { actionError } from "@/app/actions/errors";

const DECISIONS = ["approved", "rejected"] as const;
type Decision = (typeof DECISIONS)[number];

function isDecision(value: unknown): value is Decision {
  return typeof value === "string" && (DECISIONS as readonly string[]).includes(value);
}

/** Legacy teacher approval action kept for reference/safety */
export async function reviewTeacherAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { error: auth.error };
    }

    const requestId = String(formData.get("requestId") ?? "");
    const decision = formData.get("decision");

    if (!isDecision(decision)) {
      return { error: "Unknown decision." };
    }

    const decided = await reviewTeacherRequest(requestId, auth.user.id, decision);

    revalidatePath("/admin/teachers");
    revalidatePath("/dashboard");

    if (!decided) {
      return { error: "That request was already reviewed by someone else." };
    }

    const next: TeacherRequestStatus = decision;

    return {
      success:
        next === "approved"
          ? "Teacher approved. They can create courses now."
          : "Request rejected. The account stays a student.",
    };
  } catch (error) {
    return actionError("reviewTeacher", error);
  }
}

/** Admin action to create a new subject */
export async function createSubjectAction(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { error: auth.error };
    }

    const name = String(formData.get("name") ?? "");
    const stream = String(formData.get("stream") ?? "General");

    const result = await createAdminSubject(name, stream);
    if (!result.ok) {
      return { error: result.error ?? "Failed to create subject." };
    }

    revalidatePath("/admin/subjects");
    revalidatePath("/admin/questions");
    revalidatePath("/admin/questions/import");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: `Subject "${name.trim()}" created successfully.` };
  } catch (error) {
    return actionError("createSubject", error);
  }
}

/** Admin action to delete a subject */
export async function deleteSubjectAction(
  previousOrId: ActionState | string,
  formData?: FormData
): Promise<ActionState> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { error: auth.error };
    }

    const subjectId =
      typeof previousOrId === "string"
        ? previousOrId
        : String(formData?.get("subjectId") ?? "");

    if (!subjectId) {
      return { error: "Subject ID is required." };
    }

    const deleted = await deleteAdminSubject(subjectId);
    if (!deleted) {
      return { error: "Subject not found or could not be deleted." };
    }

    revalidatePath("/admin/subjects");
    revalidatePath("/admin/questions");
    revalidatePath("/admin/questions/import");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: "Subject deleted successfully." };
  } catch (error) {
    return actionError("deleteSubject", error);
  }
}

/** Admin action to create a single question manually */
export async function createAdminQuestionAction(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { error: auth.error };
    }

    const subjectId = String(formData.get("subject_id") ?? "");
    const stem = String(formData.get("stem") ?? "");
    const optionA = String(formData.get("option_a") ?? "");
    const optionB = String(formData.get("option_b") ?? "");
    const optionC = String(formData.get("option_c") ?? "");
    const optionD = String(formData.get("option_d") ?? "");
    const correctOption = String(formData.get("correct_option") ?? "");
    const explanation = String(formData.get("explanation") ?? "");

    if (!subjectId) {
      return { error: "Please select a subject." };
    }

    const result = await createAdminQuestion({
      subjectId,
      authorId: auth.user.id,
      stem,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
    });

    if (!result.ok) {
      return { error: result.error ?? "Failed to create question." };
    }

    revalidatePath("/admin/questions");
    revalidatePath("/admin/subjects");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: "Question added to pool successfully." };
  } catch (error) {
    return actionError("createAdminQuestion", error);
  }
}

/** Admin action to delete a question from the pool */
export async function deleteAdminQuestionAction(
  previousOrId: ActionState | string,
  formData?: FormData
): Promise<ActionState> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { error: auth.error };
    }

    const questionId =
      typeof previousOrId === "string"
        ? previousOrId
        : String(formData?.get("questionId") ?? "");

    if (!questionId) {
      return { error: "Question ID is required." };
    }

    const deleted = await deleteAdminQuestion(questionId);
    if (!deleted) {
      return { error: "Question not found or already deleted." };
    }

    revalidatePath("/admin/questions");
    revalidatePath("/admin/subjects");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: "Question deleted from pool." };
  } catch (error) {
    return actionError("deleteAdminQuestion", error);
  }
}

/** Admin action to approve & batch import staged questions into the pool */
export async function approveAndImportQuestionsAction(
  questions: BatchQuestionInput[]
): Promise<{ ok: boolean; inserted?: number; errors?: string[]; error?: string }> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    if (!questions || questions.length === 0) {
      return { ok: false, error: "No questions provided for approval." };
    }

    const result = await batchApproveAndCreateAdminQuestions(auth.user.id, questions);

    revalidatePath("/admin/questions");
    revalidatePath("/admin/subjects");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return {
      ok: true,
      inserted: result.inserted,
      errors: result.errors,
    };
  } catch (error) {
    console.error("[action:approveAndImportQuestions]", error);
    return { ok: false, error: "Failed to import questions. Please check connection." };
  }
}

/** Admin action to synchronize scores from sessions into the leaderboard */
export async function syncLeaderboardAction(): Promise<ActionState> {
  try {
    const auth = await authorize(["admin"]);
    if (!auth.ok) {
      return { error: auth.error };
    }

    const count = await syncLeaderboardFromSessions();

    revalidatePath("/admin/leaderboard");
    revalidatePath("/admin/students");
    revalidatePath("/dashboard");

    return {
      success: `Leaderboard successfully synchronized with ${count} session records.`,
    };
  } catch (error) {
    return actionError("syncLeaderboard", error);
  }
}
