import { NextResponse } from "next/server";
import { isSupabaseServerConfigured, getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const fastapiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
  let fastApiStatus = "offline";
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
    }
  } catch (err: unknown) {
    fastApiStatus = "unreachable";
    fastApiDetails = { error: err instanceof Error ? err.message : "Connection failed" };
  }

  const supabaseConfigured = isSupabaseServerConfigured();
  let supabaseDbStatus = "not_configured";

  if (supabaseConfigured) {
    try {
      const supabase = getSupabaseServer();
      const { error } = await supabase.from("notes").select("id").limit(1);
      supabaseDbStatus = error ? `table_missing_or_error: ${error.message}` : "connected";
    } catch {
      supabaseDbStatus = "error";
    }
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      nextjs_frontend: "online",
      nextjs_backend_api: "online",
      fastapi_python_ai: {
        status: fastApiStatus,
        url: fastapiUrl,
        details: fastApiDetails,
      },
      supabase: {
        configured: supabaseConfigured,
        database_status: supabaseDbStatus,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set",
        bucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "app-storage",
      },
    },
  });
}
