"use server";

import * as jose from "jose";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const TESO_API_BASE = process.env.TESO_API_URL ?? "http://localhost:8000";
const JWT_SECRET = process.env.JWT_SECRET ?? "e69b4a2d8f1c7e69b54d92a11fc839j44d72e6f9a0c3b8a1e4d5fgc729db4af1";

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized: Please sign in first.");
  }

  const secret = new TextEncoder().encode(JWT_SECRET);
  const jwt = await new jose.SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return {
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Student Revision Actions
// ---------------------------------------------------------------------------

export async function getEnrolledSubjects() {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/revision/enrolled-subjects`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch enrolled subjects: ${await res.text()}`);
  }
  return await res.json();
}

export async function enrollSubjects(subjectIds: string[]) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/revision/enroll`, {
    method: "POST",
    headers,
    body: JSON.stringify({ subject_ids: subjectIds }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to enroll subjects: ${await res.text()}`);
  }
  revalidatePath("/revison");
  return await res.json();
}

export async function getMultiSubjectRevisionQueue(subjectId?: string, limit: number = 20) {
  const headers = await getAuthHeader();
  const url = new URL(`${TESO_API_BASE}/api/revision/queue`);
  if (subjectId) url.searchParams.set("subject_id", subjectId);
  url.searchParams.set("limit", limit.toString());

  const res = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch revision queue: ${await res.text()}`);
  }
  return await res.json();
}

export async function startRevisionQuiz(subjectId?: string, subtopicId?: string, questionCount: number = 10) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/revision/quiz/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject_id: subjectId || null,
      subtopic_id: subtopicId || null,
      question_count: questionCount,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to start quiz session: ${await res.text()}`);
  }
  return await res.json();
}

export async function submitRevisionQuiz(sessionId: string, answers: any[]) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/revision/quiz/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      answers,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to submit quiz session: ${await res.text()}`);
  }
  revalidatePath("/revison");
  return await res.json();
}

// ---------------------------------------------------------------------------
// Admin Question Workbench Actions
// ---------------------------------------------------------------------------

export async function getAdminSubjects(examLevel?: string) {
  const headers = await getAuthHeader();
  const url = new URL(`${TESO_API_BASE}/api/admin/subjects`);
  if (examLevel) url.searchParams.set("exam_level", examLevel);

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function getAdminTopics(subjectId: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/admin/topics?subject_id=${subjectId}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function getAdminSubtopics(topicId: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/admin/subtopics?topic_id=${topicId}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function getAdminQuestions(params: {
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
  examLevel?: string;
  search?: string;
  skip?: number;
  limit?: number;
}) {
  const headers = await getAuthHeader();
  const url = new URL(`${TESO_API_BASE}/api/admin/questions`);
  if (params.subjectId) url.searchParams.set("subject_id", params.subjectId);
  if (params.topicId) url.searchParams.set("topic_id", params.topicId);
  if (params.subtopicId) url.searchParams.set("subtopic_id", params.subtopicId);
  if (params.examLevel) url.searchParams.set("exam_level", params.examLevel);
  if (params.search) url.searchParams.set("search", params.search);
  url.searchParams.set("skip", (params.skip || 0).toString());
  url.searchParams.set("limit", (params.limit || 50).toString());

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function createAdminQuestion(payload: any) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/admin/questions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath("/admin/questions");
  return await res.json();
}

export async function getAdminQuestionAnalytics(questionId: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/admin/questions/${questionId}/analytics`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function submitSingleQuestionAnswer(
  sessionId: string,
  questionId: string,
  selectedAnswerNumber: number | null,
  responseTimeMs: number = 0
) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/revision/quiz/submit-single`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      selected_answer_number: selectedAnswerNumber,
      response_time_ms: responseTimeMs,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function suggestSyllabusOrder(subjectId?: string, topicId?: string) {
  const headers = await getAuthHeader();
  const url = new URL(`${TESO_API_BASE}/api/admin/suggest-order`);
  if (subjectId) url.searchParams.set("subject_id", subjectId);
  if (topicId) url.searchParams.set("topic_id", topicId);

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function secretAdminLogin(email: string, password: string, secretKey: string) {
  const res = await fetch(`${TESO_API_BASE}/api/admin/secret-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      secret_key: secretKey,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Invalid admin credentials");
  }
  return await res.json();
}

export async function getRevisionHistory(limit: number = 20) {
  const headers = await getAuthHeader();
  const url = new URL(`${TESO_API_BASE}/api/revision/history`);
  url.searchParams.set("limit", limit.toString());
  const res = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch revision history: ${await res.text()}`);
  }
  return await res.json();
}

export async function recordRevisionSessionHistory(payload: {
  session_id: string;
  subject_id?: string | null;
  subtopic_id?: string | null;
  session_title?: string | null;
  score_percentage: number;
  correct_count: number;
  total_questions: number;
  earned_xp?: number;
}) {
  const headers = await getAuthHeader();
  const res = await fetch(`${TESO_API_BASE}/api/revision/history/record`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to record revision session history: ${await res.text()}`);
  }
  return await res.json();
}

