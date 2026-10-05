"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/dal";
import { reviewTeacherRequest } from "@/lib/db/queries";
import type { ActionState } from "@/app/actions/auth";
import type { TeacherRequestStatus } from "@/lib/auth/roles";

const DECISIONS = ["approved", "rejected"] as const;

type Decision = (typeof DECISIONS)[number];

function isDecision(value: unknown): value is Decision {
  return typeof value === "string" && (DECISIONS as readonly string[]).includes(value);
}

/**
 * Admin-only. The decision is applied by a single conditional statement so a
 * request someone else already reviewed is reported as such instead of
 * overwriting their decision.
 */
export async function reviewTeacherAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
}
