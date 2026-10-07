import { NextRequest } from "next/server";
import { assessmentIdentity, demoEnabled } from "@/lib/assessment-identity";
import { problemResponse } from "@/lib/api/problems-response";
export async function GET(req: NextRequest) {
  try {
    const identity = await assessmentIdentity(req);
    return Response.json({ authenticated: Boolean(identity), is_development: identity?.is_development ?? false, demo_available: demoEnabled() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return problemResponse(503, "Authentication is unavailable. Check the Neon Auth and frontend database configuration.");
  }
}
