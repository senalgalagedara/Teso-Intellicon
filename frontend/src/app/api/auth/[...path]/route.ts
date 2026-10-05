import { getAuth } from "@/lib/auth-server";
import { NextRequest } from "next/server";
export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try { return await getAuth().handler().GET(req, ctx); }
  catch { return Response.json({ error: "Authentication service unavailable" }, { status: 503 }); }
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try { return await getAuth().handler().POST(req, ctx); }
  catch { return Response.json({ error: "Authentication service unavailable" }, { status: 503 }); }
}
