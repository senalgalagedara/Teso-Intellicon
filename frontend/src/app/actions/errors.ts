import type { ActionState } from "@/app/actions/auth";

/**
 * Convert an unexpected Server Action failure into a form-level error instead
 * of letting it crash the request (which otherwise surfaces as an error
 * overlay/boundary with nothing recoverable for the user). The real error is
 * logged server-side; the state only carries a generic, safe message.
 *
 * Only wrap the fallible parts of an action. `redirect()` and `notFound()`
 * throw to steer the router, so they must stay outside any try/catch.
 */
export function actionError(label: string, error: unknown): ActionState {
  console.error(`[action:${label}] unexpected failure`, error);
  return { error: "Something went wrong. Please try again." };
}