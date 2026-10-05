export const ROLES = ["student", "teacher_pending", "teacher", "admin"] as const;

export type UserRole = (typeof ROLES)[number];

export const TEACHER_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

export type TeacherRequestStatus = (typeof TEACHER_REQUEST_STATUSES)[number];

export const ENROLLMENT_STATUSES = ["invited", "accepted", "declined"] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Roles that are still waiting on an admin decision. */
export const PENDING_ROLES: readonly UserRole[] = ["teacher_pending"];

/**
 * Roles a person may pick for themselves on the sign-up form. `admin` is not
 * here and `teacher` is not either: a self-declared teacher starts as
 * `teacher_pending` and only becomes `teacher` once an admin approves.
 */
export const SELF_ASSIGNABLE_ROLES = ["student", "teacher"] as const;

export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export function isSelfAssignableRole(value: unknown): value is SelfAssignableRole {
  return typeof value === "string" && (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(value);
}
