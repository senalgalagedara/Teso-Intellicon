import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, demoIdentity, sign, sameOrigin } from "@/lib/assessment-identity";
import { problemResponse } from "@/lib/api/problems-response";
export async function POST(req: NextRequest) {
  if (!demoEnabled()) return problemResponse(404, "Local demo disabled");
  if (!sameOrigin(req)) return problemResponse(403, "Same-origin request required");
  try {
    const response = NextResponse.json({ status: "development_demo" });
    if (!demoIdentity(req)) {
      const value = Buffer.from(JSON.stringify({ id: `dev-${randomUUID()}`, expires: Date.now() + 86400000 })).toString("base64url");
      response.cookies.set("teso_demo", `${value}.${sign(value)}`, { httpOnly: true, sameSite: "strict", secure: req.nextUrl.protocol === "https:", maxAge: 86400, path: "/" });
    }
    return response;
  } catch { return problemResponse(503, "Assessment bridge unavailable"); }
}
