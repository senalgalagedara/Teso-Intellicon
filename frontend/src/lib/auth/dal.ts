import "server-only";

import { cache } from "react";

import { auth } from "@/lib/auth/server";
import { problemResponse } from "@/lib/api/problems-response";
import { resolveUserRole } from "@/lib/db/queries";
import type { UserRole } from "@/lib/auth/roles";

export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type AuthSuccess = {
  ok: true;
  user: AuthedUser;
};

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Resolves the signed-in user together with their application role.
 *
 * Memoised per render pass so a page that renders the nav, the body and a leaf
 * component hits the session and the role row once. The role always comes from
 * Postgres, never from the session cookie, so an approval takes effect on the
 * next request instead of waiting for a token to expire.
 *
 * Returns null when there is no session. Callers must still treat the role as
 * untrusted input for anything beyond display.
 */
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
  const { data, error } = await auth.getSession();

  if (error || !data?.user) {
    return null;
  }

  const { id, name, email } = data.user;
  const role = await resolveUserRole(id, email);

  return { id, name, email, role };
});

/**
 * Server-side role gate for Route Handlers and Server Actions.
 *
 * Returns a discriminated result rather than throwing so each caller can pick
 * the right transport: an HTTP status for a Route Handler, a form error for a
 * Server Action.
 */
export async function authorize(allowedRoles: readonly UserRole[]): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, status: 401, error: "You must be signed in." };
  }

  if (!allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, error: "Your account does not have access to this." };
  }

  return { ok: true, user };
}

export function deny(result: AuthFailure): Response {
  return problemResponse(result.status, result.error, {
    ...(result.status === 401 ? { type: "unauthenticated" } : { type: "forbidden" }),
  });
}

/** Human-readable label for a role, used in the UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  teacher_pending: "Teacher (pending)",
  teacher: "Teacher",
  admin: "Admin",
};
