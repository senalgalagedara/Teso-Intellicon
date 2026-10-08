import { fastapiBaseUrl } from "@/lib/fastapi-url";
import { NextRequest, NextResponse } from "next/server";

import { authorize, deny } from "@/lib/auth/dal";
import { readProblem } from "@/lib/api/problems";
import { problemResponse } from "@/lib/api/problems-response";

const ALLOWED_ACTIONS = ["chat", "analyze", "embeddings"] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ALLOWED_ACTIONS as readonly string[]).includes(value);
}

/**
 * Server-side proxy to the FastAPI AI engine. Any signed-in account may call
 * it; the endpoint list is fixed here so the request cannot be pointed at an
 * arbitrary FastAPI path.
 */
export async function POST(req: NextRequest) {
  const auth = await authorize(["student", "teacher_pending", "teacher", "admin"]);

  if (!auth.ok) {
    return deny(auth);
  }

  const fastapiUrl = fastapiBaseUrl();

  try {
    const body = await req.json();
    const action = isAction(body.action) ? body.action : "chat";

    const targetEndpoint = `${fastapiUrl}/api/ai/${action}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.payload ?? body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const problem = await readProblem(response).catch(() => undefined);
      console.error("[api/ai] upstream error", { action, status: response.status, detail: problem?.detail });
      if (response.status >= 500) {
        return problemResponse(503, "The AI service is temporarily unavailable. Please try again shortly.");
      }
      return problemResponse(problem?.status ?? response.status, problem?.detail ?? "The request was rejected.", {
        title: problem?.title,
        type: problem?.type,
        errors: problem?.errors,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[api/ai] proxy failed", err);
    return problemResponse(503, "The AI service is temporarily unavailable. Please try again shortly.");
  }
}