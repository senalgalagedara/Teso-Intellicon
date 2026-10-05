import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { assessmentIdentity, sameOrigin, sign } from "@/lib/assessment-identity";
import { fastapiBaseUrl } from "@/lib/fastapi-url";
const allowed = (method: string, path: string) =>
  (method === "GET" && /^(papers|sessions|sessions\/[a-f0-9-]+(\/(results|job)|\/media\/[a-zA-Z0-9_-]+)?)$/.test(path)) ||
  (method === "POST" && /^(sessions|sessions\/[a-f0-9-]+\/submit)$/.test(path)) ||
  (method === "PUT" && /^sessions\/[a-f0-9-]+\/draft$/.test(path));
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  if (!allowed(req.method, path)) return Response.json({ error: "Unknown assessment endpoint" }, { status: 404 });
  if (req.method !== "GET" && !sameOrigin(req)) return Response.json({ error: "Same-origin request required" }, { status: 403 });
  try {
    const identity = await assessmentIdentity(req);
    if (!identity) return Response.json({ error: "Sign in to continue" }, { status: 401 });
    if (Number(req.headers.get("content-length")) > 128000) return Response.json({ error: "Request too large" }, { status: 413 });
    const body = req.method === "GET" ? "" : await req.text();
    if (Buffer.byteLength(body) > 128000) return Response.json({ error: "Request too large" }, { status: 413 });
    const targetPath = `/api/assessments/${path}`;
    const payload = Buffer.from(JSON.stringify({ ...identity, issued_at: Date.now() / 1000, method: req.method, path: targetPath, body_sha256: createHash("sha256").update(body).digest("hex") })).toString("base64url");
    const upstream = await fetch(`${fastapiBaseUrl()}${targetPath}`, {
      method: req.method, headers: { "Content-Type": "application/json", "X-Teso-Identity": `${payload}.${sign(payload)}` },
      body: body || undefined, signal: AbortSignal.timeout(45000), cache: "no-store" });
    if (upstream.status >= 500) return Response.json({ error: "Assessment service temporarily unavailable" }, { status: 503 });
    return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return Response.json({ error: "Assessment or authentication service unavailable" }, { status: 503 }); }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
