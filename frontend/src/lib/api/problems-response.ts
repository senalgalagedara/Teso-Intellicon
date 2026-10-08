import { NextResponse } from "next/server";

import type { Problem, ProblemErrorField } from "@/lib/api/problems";

/**
 * Server-only helper: build an RFC 9457 problem response for a Route Handler.
 * Exported with Content-Type: application/problem+json so clients can rely on
 * one error shape. Keep this out of browser bundles (next/server).
 */
export function problemResponse(
  status: number,
  detail: string,
  init?: { title?: string; type?: string; instance?: string; errors?: ProblemErrorField[]; headers?: HeadersInit }
): NextResponse {
  const body: Problem = {
    type: init?.type ?? "about:blank",
    title: init?.title ?? defaultTitle(status) ?? "Request failed",
    status,
    detail,
    ...(init?.instance ? { instance: init.instance } : {}),
    ...(init?.errors ? { errors: init.errors } : {}),
  };

  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json", ...(init?.headers ?? {}) },
  });
}

function defaultTitle(status: number): string | undefined {
  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    case 409:
      return "Conflict";
    case 413:
      return "Payload Too Large";
    case 422:
      return "Unprocessable Entity";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    default:
      return undefined;
  }
}