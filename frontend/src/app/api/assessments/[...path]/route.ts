import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { assessmentIdentity, sameOrigin, sign } from "@/lib/assessment-identity";
import { fastapiBaseUrl } from "@/lib/fastapi-url";
import { readProblem } from "@/lib/api/problems";
import { problemResponse } from "@/lib/api/problems-response";
const allowed = (method: string, path: string) =>
  (method === "GET" && /^(papers|history|sessions|sessions\/[a-f0-9-]+(\/(results|job|recommendation)|\/media\/[a-zA-Z0-9_-]+)?)$/.test(path)) ||
  (method === "POST" && /^(sessions|sessions\/[a-f0-9-]+\/(submit|next|check))$/.test(path)) ||
  (method === "PUT" && /^sessions\/[a-f0-9-]+\/draft$/.test(path));
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  if (!allowed(req.method, path)) return problemResponse(404, "Unknown assessment endpoint");
  if (req.method !== "GET" && !sameOrigin(req)) return problemResponse(403, "Same-origin request required");
  try {
    const identity = await assessmentIdentity(req);
    if (!identity) return problemResponse(401, "Sign in to continue");
    if (Number(req.headers.get("content-length")) > 128000) return problemResponse(413, "Request too large");
    const body = req.method === "GET" ? "" : await req.text();
    if (Buffer.byteLength(body) > 128000) return problemResponse(413, "Request too large");
    const targetPath = `/api/assessments/${path}`;
    const payload = Buffer.from(JSON.stringify({ ...identity, issued_at: Date.now() / 1000, method: req.method, path: targetPath, body_sha256: createHash("sha256").update(body).digest("hex") })).toString("base64url");
    const upstream = await fetch(`${fastapiBaseUrl()}${targetPath}`, {
      method: req.method, headers: { "Content-Type": "application/json", "X-Teso-Identity": `${payload}.${sign(payload)}` },
      body: body || undefined, signal: AbortSignal.timeout(45000), cache: "no-store" });
    if (upstream.status >= 500) {
      const problem = await readProblem(upstream).catch(() => undefined);
      console.error("[api/assessments] upstream error", {
        path: targetPath, method: req.method, status: upstream.status, detail: problem?.detail,
      });
      return problemResponse(503, "Assessment service temporarily unavailable");
    }
    if (!upstream.ok) {
      const problem = await readProblem(upstream);
      return problemResponse(problem.status, problem.detail, {
        title: problem.title, type: problem.type, errors: problem.errors,
      });
    }
    return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (err) {
    console.error("[api/assessments] proxy failed", err);
    return problemResponse(503, "Assessment service temporarily unavailable");
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;