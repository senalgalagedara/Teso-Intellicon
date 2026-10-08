"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/dal";
import {
  createCourse,
  deleteCourse,
  inviteStudentToCourse,
  removeStudentFromCourse,
} from "@/lib/db/courses";
import type { ActionState } from "@/app/actions/auth";
import { actionError } from "@/app/actions/errors";

/**
 * Every action below re-reads the session and the stored role before touching
 * Postgres. The hidden inputs in the form are treated as untrusted: a student
 * who edits `teacherId` in the DOM still fails the role check.
 */
export async function createCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await authorize(["teacher"]);

    if (!auth.ok) {
      return { error: auth.error };
    }

    const rawDescription = formData.get("description");
    const description =
      typeof rawDescription === "string" && rawDescription.trim().length > 0
        ? rawDescription.trim().slice(0, 2000)
        : null;

    const result = await createCourse(
      auth.user.id,
      String(formData.get("title") ?? ""),
      description,
    );

    if (!result.ok) {
      return { error: result.error };
    }

    revalidatePath("/teacher");
    return { success: `Course created. Join code: ${result.course.code}` };
  } catch (error) {
    return actionError("createCourse", error);
  }
}

export async function inviteStudentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await authorize(["teacher"]);

    if (!auth.ok) {
      return { error: auth.error };
    }

    const courseId = String(formData.get("courseId") ?? "");
    const email = String(formData.get("email") ?? "");

    const result = await inviteStudentToCourse(auth.user.id, courseId, email);

    if (!result.ok) {
      return { error: result.error };
    }

    revalidatePath(`/teacher/courses/${courseId}`);
    return { success: `Invitation sent to ${email.trim().toLowerCase()}.` };
  } catch (error) {
    return actionError("inviteStudent", error);
  }
}

export async function removeStudentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await authorize(["teacher"]);

    if (!auth.ok) {
      return { error: auth.error };
    }

    const courseId = String(formData.get("courseId") ?? "");
    const enrollmentId = String(formData.get("enrollmentId") ?? "");

    const result = await removeStudentFromCourse(auth.user.id, courseId, enrollmentId);

    if (!result.ok) {
      return { error: result.error ?? "Could not remove that student." };
    }

    revalidatePath(`/teacher/courses/${courseId}`);
    return { success: "Student removed from the course." };
  } catch (error) {
    return actionError("removeStudent", error);
  }
}

export async function deleteCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await authorize(["teacher"]);

    if (!auth.ok) {
      return { error: auth.error };
    }

    const courseId = String(formData.get("courseId") ?? "");
    const result = await deleteCourse(auth.user.id, courseId);

    if (!result.ok) {
      return { error: result.error ?? "Could not delete that course." };
    }

    revalidatePath("/teacher");
    return { success: "Course deleted." };
  } catch (error) {
    return actionError("deleteCourse", error);
  }
}
