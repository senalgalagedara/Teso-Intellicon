import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const fastapiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";

  try {
    const body = await req.json();
    const action = body.action || "chat"; // 'chat' | 'analyze' | 'embeddings'

    let targetEndpoint = `${fastapiUrl}/api/ai/chat`;
    if (action === "analyze") {
      targetEndpoint = `${fastapiUrl}/api/ai/analyze`;
    } else if (action === "embeddings") {
      targetEndpoint = `${fastapiUrl}/api/ai/embeddings`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.payload || body),
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
