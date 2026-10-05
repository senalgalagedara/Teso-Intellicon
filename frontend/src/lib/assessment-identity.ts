import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { getAuth } from "./auth-server";
export const demoEnabled = () => process.env.NODE_ENV !== "production" && process.env.TESO_DEMO_MODE === "true";
export function sign(value: string) {
  const secret = process.env.ASSESSMENT_BRIDGE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Assessment bridge is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function demoIdentity(req: NextRequest) {
  const demo = req.cookies.get("teso_demo")?.value;
  if (demoEnabled() && demo) {
    try {
      const [value, signature] = demo.split(".");
      const expected = Buffer.from(sign(value), "hex"), supplied = Buffer.from(signature, "hex");
      if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) {
        const data = JSON.parse(Buffer.from(value, "base64url").toString());
        if (typeof data.id === "string" && data.id.startsWith("dev-") && data.expires > Date.now()) return { student_id: data.id, is_development: true };
      }
    } catch { /* Invalid demo cookie cannot authenticate. */ }
  }
  return null;
}
export async function assessmentIdentity(req: NextRequest) {
  const demo = demoIdentity(req);
  if (demo) return demo;
  const { data: session } = await getAuth().getSession();
  return session?.user ? { student_id: session.user.id, is_development: false } : null;
}
export function sameOrigin(req: NextRequest) {
  try {
    const origin = new URL(req.headers.get("origin") || "");
    return origin.host === req.headers.get("host") && origin.protocol === req.nextUrl.protocol;
  } catch { return false; }
}
