"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/dal";
import { respondToInvitation } from "@/lib/db/courses";
import type { ActionState } from "@/app/actions/auth";

const RESPONSES = ["accepted", "declined"] as const;

type Response_ = (typeof RESPONSES)[number];

function isResponse(value: unknown): value is Response_ {
  return typeof value === "string" && (RESPONSES as readonly string[]).includes(value);
}

/**
 * The enrollment id comes from the form, but the update is also scoped to the
 * signed-in student's id, so one student cannot answer another's invitation.
 */
export async function respondToInviteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorize(["student"]);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const response = formData.get("response");

  if (!isResponse(response)) {
    return { error: "Unknown response." };
  }

  const result = await respondToInvitation(auth.user.id, enrollmentId, response);

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/student");

  return {
    success: response === "accepted" ? "You joined the course." : "Invitation declined.",
  };
}
