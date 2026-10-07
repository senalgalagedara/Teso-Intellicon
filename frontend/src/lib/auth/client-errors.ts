import { messageForError } from "@/lib/api/problems";

const RATE_LIMIT_PATTERN = /too many|rate limit/i;
const DUPLICATE_ACCOUNT_PATTERN = /already exists|already registered|already taken|existing account/i;

type AuthClientError = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
};

/**
 * Turn an error returned by the `@neondatabase/auth` client (better-auth
 * `{ data, error }` shape) into a line a person can act on.
 *
 * A network failure is recognised and reworded; known states such as rate
 * limiting and duplicate-account (on sign-up) get specific copy; everything
 * else falls back to the provider's own message, which is already
 * user-presentable.
 */
export function authErrorText(
  error: unknown,
  opts: { fallback: string; duplicate?: string },
): string {
  const mapped = messageForError(error, "");
  if (mapped) return mapped;

  const { status, code, message } = (error ?? {}) as AuthClientError;
  const text = typeof message === "string" ? message : "";

  if (opts.duplicate && (code === "USER_ALREADY_EXISTS" || DUPLICATE_ACCOUNT_PATTERN.test(text))) {
    return opts.duplicate;
  }

  if (status === 429 || RATE_LIMIT_PATTERN.test(text)) {
    return "Too many attempts. Please wait a moment and then try again.";
  }

  return text || opts.fallback;
}