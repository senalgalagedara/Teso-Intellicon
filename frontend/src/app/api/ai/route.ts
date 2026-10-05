import { fastapiBaseUrl } from "@/lib/fastapi-url";
import { NextRequest, NextResponse } from "next/server";

import { authorize, deny } from "@/lib/auth/dal";

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
      const errText = await response.text();
      return NextResponse.json(
        { error: `FastAPI responded with ${response.status}: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error contacting FastAPI";
    return NextResponse.json(
      {
        error: "Failed to communicate with FastAPI Python AI backend.",
        details: message,
        hint: "Ensure FastAPI is running on http://127.0.0.1:8000 (run: uvicorn app.main:app --reload)",
      },
      { status: 503 }
    );
  }
}
