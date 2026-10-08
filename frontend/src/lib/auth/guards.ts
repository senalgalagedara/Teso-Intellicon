import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type AuthedUser } from "@/lib/auth/dal";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Page-level guards. These run during the Server Component render, against the
 * role stored in Postgres, so they are the real gate. `proxy.ts` only rejects
 * requests that carry no session at all.
 */
export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireRole(...allowed: UserRole[]): Promise<AuthedUser> {
  const user = await requireUser();

  if (!allowed.includes(user.role)) {
    // Send them somewhere useful rather than a dead end.
    redirect(homeForRole(user.role));
  }

  return user;
}

export function homeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/subjects";
    case "teacher":
      return "/teacher";
    case "teacher_pending":
      return "/pending";
    case "student":
      return "/dashboard";
  }
}
