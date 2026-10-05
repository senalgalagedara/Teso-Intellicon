import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, demoIdentity, sign, sameOrigin } from "@/lib/assessment-identity";
export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: "Local demo disabled" }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Same-origin request required" }, { status: 403 });
  try {
    const response = NextResponse.json({ status: "development_demo" });
    if (!demoIdentity(req)) {
      const value = Buffer.from(JSON.stringify({ id: `dev-${randomUUID()}`, expires: Date.now() + 86400000 })).toString("base64url");
      response.cookies.set("teso_demo", `${value}.${sign(value)}`, { httpOnly: true, sameSite: "strict", secure: req.nextUrl.protocol === "https:", maxAge: 86400, path: "/" });
    }
    return response;
  } catch { return NextResponse.json({ error: "Assessment bridge unavailable" }, { status: 503 }); }
}
