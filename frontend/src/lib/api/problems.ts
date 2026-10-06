/**
 * Shared RFC 9457 "problem details" error handling for the frontend.
 *
 * Every server response in this app (FastAPI backend, Next.js route handlers,
 * auth denials) uses the same shape, so one parser works everywhere:
 *
 *   { type, title, status, detail, instance?, errors? }
 *
 * `detail` is always a user-presentable string; `type` doubles as a stable
 * error code when it is not "about:blank".
 *
 * This module is browser-safe (no next/server imports); the server-side
 * `problemResponse` helper lives in problems-response.ts.
 */

export interface ProblemErrorField {
  field?: string;
  message: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: ProblemErrorField[];
}

function firstString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Parse a Response into a Problem, tolerating non-JSON or foreign shapes. */
export async function readProblem(response: Response): Promise<Problem> {
  const fallback: Problem = {
    type: "about:blank",
    title: "Request failed",
    status: response.status,
    detail: response.statusText || `Request failed (${response.status})`,
  };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fallback;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fallback;

  const data = body as Record<string, unknown>;
  return {
    type: firstString(data.type, "about:blank"),
    title: firstString(data.title, fallback.title),
    status: typeof data.status === "number" ? data.status : fallback.status,
    detail: firstString(data.detail, firstString(data.error, fallback.detail)),
    ...(typeof data.instance === "string" ? { instance: data.instance } : {}),
    ...(Array.isArray(data.errors) ? { errors: data.errors as ProblemErrorField[] } : {}),
  };
}

/** Error thrown when a request fails; `message` is safe to show to users. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(problem: Problem, options?: { cause?: unknown }) {
    super(problem.detail, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.type !== "about:blank" ? problem.type : `http_${problem.status}`;
  }
}

/** Throw an ApiError if the response was not successful. */
export async function throwForStatus(response: Response): Promise<void> {
  if (response.ok) return;
  throw new ApiError(await readProblem(response));
}