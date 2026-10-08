/**
 * Helper to convert usernames to email addresses for Neon Auth compatibility.
 * Allows students to register and sign in using only username and password.
 */
export function usernameToEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes("@")) {
    return trimmed;
  }
  const sanitized = trimmed.replace(/[^a-z0-9._-]/g, "");
  return `${sanitized || "student"}@student.teso`;
}
