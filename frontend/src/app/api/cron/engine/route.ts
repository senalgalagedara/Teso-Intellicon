import { NextRequest, NextResponse } from "next/server";
import { engineClient } from "@/lib/engine/client";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "another-random-secret";

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job") || "refresh_item_stats";

  try {
    const result = await engineClient.runJob(job);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Engine job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
