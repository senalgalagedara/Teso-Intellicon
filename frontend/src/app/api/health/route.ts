import { fastapiBaseUrl } from "@/lib/fastapi-url";
import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const fastapiUrl = fastapiBaseUrl();

export async function GET() {
  const authConfigured = Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );

  let databaseStatus = "unreachable";

  try {
    const rows = await query<{ ok: number }>`SELECT 1 AS ok`;
    databaseStatus = rows[0]?.ok === 1 ? "connected" : "unexpected_response";
  } catch (err: unknown) {
    databaseStatus = err instanceof Error ? err.message : "connection_failed";
  }

  let fastApiStatus = "unreachable";
  let fastApiDetails: Record<string, unknown> = {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${fastapiUrl}/health`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      fastApiStatus = "online";
      fastApiDetails = await res.json();
    } else {
      fastApiStatus = `http_${res.status}`;
    }
  } catch (err: unknown) {
    fastApiDetails = { error: err instanceof Error ? err.message : "Connection failed" };
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      nextjs: "online",
      neon_auth: authConfigured ? "configured" : "missing_env",
      postgres: databaseStatus,
      fastapi_python_ai: {
        status: fastApiStatus,
        url: fastapiUrl,
        details: fastApiDetails,
      },
    },
  });
}
