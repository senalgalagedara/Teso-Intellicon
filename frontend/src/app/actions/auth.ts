"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/dal";
import { isSelfAssignableRole } from "@/lib/auth/roles";
import { requestTeacherAccess } from "@/lib/db/queries";
import { actionError } from "@/app/actions/errors";

export type ActionState = {
  error?: string;
  success?: string;
};

/**
 * Runs once after the browser client has created the auth session, to record
 * the role the person chose at sign-up.
 *
 * The choice is only honoured for accounts that have no decided role yet, so
 * re-running this cannot demote a teacher or an admin. `admin` is not an
 * option here at all; it is granted by `ADMIN_EMAILS`.
 */
export async function finishSignUpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requested = formData.get("role");

  if (!isSelfAssignableRole(requested)) {
    return { error: "Choose whether you are joining as a student or a teacher." };
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    return actionError("finishSignUp.readSession", error);
  }

  if (!user) {
    return { error: "Your account was created but no session was found. Please sign in." };
  }

  if (user.role !== "student") {
    redirect("/dashboard");
  }

  if (requested === "teacher") {
    const rawNote = formData.get("note");
    const note =
      typeof rawNote === "string" && rawNote.trim().length > 0
        ? rawNote.trim().slice(0, 500)
        : null;

    try {
      await requestTeacherAccess(user.id, user.email, note);
    } catch (error) {
      return actionError("finishSignUp.requestTeacherAccess", error);
    }
    redirect("/pending");
  }

  redirect("/dashboard");
}
