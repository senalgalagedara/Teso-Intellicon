import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { assessmentIdentity, sameOrigin, sign } from "@/lib/assessment-identity";
import { fastapiBaseUrl } from "@/lib/fastapi-url";
import { readProblem } from "@/lib/api/problems";
import { problemResponse } from "@/lib/api/problems-response";
import {
  getCustomPapers,
  parseSubjectIdFromPaperId,
  isCustomSession,
  startCustomSession,
  getCustomExam,
  checkCustomAnswer,
  submitCustomSession,
  getCustomResults,
  getCustomSessions,
} from "@/lib/db/assessment-adapter";

const allowed = (method: string, path: string) =>
  (method === "GET" &&
    /^(papers|history|sessions|sessions\/[a-f0-9-]+(\/(results|job|recommendation)|\/media\/[a-zA-Z0-9_-]+)?)$/.test(
      path
    )) ||
  (method === "POST" &&
    /^(sessions|sessions\/[a-f0-9-]+\/(submit|next|check))$/.test(path)) ||
  (method === "PUT" && /^sessions\/[a-f0-9-]+\/draft$/.test(path));

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const path = (await ctx.params).path.join("/");
  if (!allowed(req.method, path)) return problemResponse(404, "Unknown assessment endpoint");
  if (req.method !== "GET" && !sameOrigin(req)) return problemResponse(403, "Same-origin request required");

  try {
    const identity = await assessmentIdentity(req);
    if (!identity) return problemResponse(401, "Sign in to continue");
    if (Number(req.headers.get("content-length")) > 128000) return problemResponse(413, "Request too large");

    const bodyText = req.method === "GET" ? "" : await req.text();
    if (Buffer.byteLength(bodyText) > 128000) return problemResponse(413, "Request too large");

    // 1. GET PAPERS — merge Admin PostgreSQL Subjects with FastAPI papers
    if (req.method === "GET" && path === "papers") {
      const customPapers = await getCustomPapers();

      let upstreamPapers: any[] = [];
      try {
        const targetPath = `/api/assessments/${path}`;
        const payload = Buffer.from(
          JSON.stringify({
            ...identity,
            issued_at: Date.now() / 1000,
            method: req.method,
            path: targetPath,
            body_sha256: createHash("sha256").update(bodyText).digest("hex"),
          })
        ).toString("base64url");

        const upstream = await fetch(`${fastapiBaseUrl()}${targetPath}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Teso-Identity": `${payload}.${sign(payload)}`,
          },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });

        if (upstream.ok) {
          const data = await upstream.json();
          if (Array.isArray(data?.papers)) {
            upstreamPapers = data.papers;
          }
        }
      } catch (err) {
        // FastAPI may be offline; custom papers in Neon still serve perfectly
      }

      // Return both custom admin subjects and upstream papers
      return Response.json(
        { papers: [...customPapers, ...upstreamPapers] },
        { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }
      );
    }

    // 2. POST SESSIONS — Start session for an admin subject
    if (req.method === "POST" && path === "sessions") {
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(bodyText);
      } catch {
        // fallback
      }

      const paperId = String(bodyObj.paper_id ?? "");
      const subjectId = parseSubjectIdFromPaperId(paperId);

      if (subjectId) {
        const customSession = await startCustomSession(
          subjectId,
          identity.student_id,
          bodyObj.language || "en"
        );
        if (customSession) {
          return Response.json(customSession, {
            headers: { "Cache-Control": "private, no-store" },
          });
        }
      }
    }

    // 3. GET SESSIONS LIST
    if (req.method === "GET" && path === "sessions") {
      const customSessions = await getCustomSessions(identity.student_id);

      let upstreamSessions: any[] = [];
      try {
        const targetPath = `/api/assessments/${path}`;
        const payload = Buffer.from(
          JSON.stringify({
            ...identity,
            issued_at: Date.now() / 1000,
            method: req.method,
            path: targetPath,
            body_sha256: createHash("sha256").update(bodyText).digest("hex"),
          })
        ).toString("base64url");

        const upstream = await fetch(`${fastapiBaseUrl()}${targetPath}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Teso-Identity": `${payload}.${sign(payload)}`,
          },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });

        if (upstream.ok) {
          const data = await upstream.json();
          if (Array.isArray(data?.sessions)) {
            upstreamSessions = data.sessions;
          }
        }
      } catch {
        // ignore upstream failure
      }

      return Response.json(
        { sessions: [...customSessions, ...upstreamSessions] },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    // 4. SESSION-SPECIFIC CUSTOM HANDLERS (sid)
    const sessionMatch = path.match(/^sessions\/([a-f0-9-]+)(?:\/(.*))?$/);
    if (sessionMatch) {
      const sid = sessionMatch[1];
      const subAction = sessionMatch[2] || "";

      if (await isCustomSession(sid)) {
        // GET sessions/{sid} -> Exam Questions
        if (req.method === "GET" && !subAction) {
          const exam = await getCustomExam(sid);
          if (exam) {
            return Response.json(exam, { headers: { "Cache-Control": "private, no-store" } });
          }
        }

        // POST sessions/{sid}/check -> Instant feedback
        if (req.method === "POST" && subAction === "check") {
          let bodyObj: any = {};
          try {
            bodyObj = JSON.parse(bodyText);
          } catch {}
          const checkRes = await checkCustomAnswer(
            sid,
            bodyObj.question_id,
            bodyObj.selected_option
          );
          if (checkRes) {
            return Response.json(checkRes, { headers: { "Cache-Control": "private, no-store" } });
          }
        }

        // POST sessions/{sid}/submit -> Finish run
        if (req.method === "POST" && subAction === "submit") {
          await submitCustomSession(sid);
          return Response.json(
            { session_id: sid, status: "submitted" },
            { headers: { "Cache-Control": "private, no-store" } }
          );
        }

        // GET sessions/{sid}/results -> Score & Review
        if (req.method === "GET" && subAction === "results") {
          const results = await getCustomResults(sid);
          if (results) {
            return Response.json(results, { headers: { "Cache-Control": "private, no-store" } });
          }
        }

        // PUT sessions/{sid}/draft
        if (req.method === "PUT" && subAction === "draft") {
          return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
        }
      }
    }

    // 5. UPSTREAM PROXY FOR FASTAPI PAPERS/ENDPOINTS
    const targetPath = `/api/assessments/${path}`;
    const payload = Buffer.from(
      JSON.stringify({
        ...identity,
        issued_at: Date.now() / 1000,
        method: req.method,
        path: targetPath,
        body_sha256: createHash("sha256").update(bodyText).digest("hex"),
      })
    ).toString("base64url");

    const upstream = await fetch(`${fastapiBaseUrl()}${targetPath}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-Teso-Identity": `${payload}.${sign(payload)}`,
      },
      body: bodyText || undefined,
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    });

    if (upstream.status >= 500) {
      const problem = await readProblem(upstream).catch(() => undefined);
      console.error("[api/assessments] upstream error", {
        path: targetPath,
        method: req.method,
        status: upstream.status,
        detail: problem?.detail,
      });
      return problemResponse(503, "Assessment service temporarily unavailable");
    }

    if (!upstream.ok) {
      const problem = await readProblem(upstream);
      return problemResponse(problem.status, problem.detail, {
        title: problem.title,
        type: problem.type,
        errors: problem.errors,
      });
    }

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[api/assessments] proxy failed", err);
    return problemResponse(503, "Assessment service temporarily unavailable");
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;