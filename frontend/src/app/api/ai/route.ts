import { NextRequest, NextResponse } from "next/server";
import { fastapiBaseUrl } from "@/lib/fastapi-url";

export async function POST(req: NextRequest) {
  try {
    const fastapiUrl = fastapiBaseUrl();
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
        hint: "Check FASTAPI_BASE_URL and the independently hosted Agentic service.",
      },
      { status: 503 }
    );
  }
}
