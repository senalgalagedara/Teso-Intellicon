"use server";

import * as jose from "jose";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const TESO_API_BASE = process.env.TESO_API_URL ?? "http://localhost:8000";
const JWT_SECRET = process.env.JWT_SECRET ?? "e69b4a2d8f1c7e69b54d92a11fc839j44d72e6f9a0c3b8a1e4d5fgc729db4af1";

// Helper to construct headers with Bearer JWT
async function getAuthHeader(): Promise<Record<string, string>> {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized: Please sign in first.");
  }

  // Sign token matching Python auth's expectations (sub claim)
  const secret = new TextEncoder().encode(JWT_SECRET);
  const jwt = await new jose.SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return {
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
}

// ==========================================
// 1. DASHBOARD
// ==========================================
export async function getDashboard() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/dashboard`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch dashboard: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getDashboard error:", error);
    throw error;
  }
}

// ==========================================
// 2. REVISION QUEUE (Spaced Repetition)
// ==========================================
export async function getRevisionQueue(limit: number = 10) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/revision-queue?limit=${limit}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch revision queue: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getRevisionQueue error:", error);
    throw error;
  }
}

export async function markRevisionDone(
  skillId: string,
  performanceScore: number,
  durationMinutes: number,
  confidenceRating: number,
  notes?: string
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/revision-done`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        skill_id: skillId,
        performance_score: performanceScore,
        duration_minutes: durationMinutes,
        confidence_rating: confidenceRating,
        notes,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to mark revision as done: ${text}`);
    }

    const data = await res.json();
    try {
      revalidatePath("/revison");
      revalidatePath("/progress");
    } catch (err: any) {
      console.error("revalidatePath error:", err);
    }

    return data;
  } catch (error: any) {
    console.error("markRevisionDone error:", error);
    throw error;
  }
}

// ==========================================
// 3. ADAPTIVE QUIZ
// ==========================================
export async function getAdaptiveQuiz(skillIds: string[], count: number = 10) {
  try {
    const headers = await getAuthHeader();
    const joinedSkillIds = skillIds.join(",");
    const res = await fetch(
      `${TESO_API_BASE}/api/adaptive/quiz/adaptive?skill_ids=${encodeURIComponent(
        joinedSkillIds
      )}&count=${count}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to generate adaptive quiz: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getAdaptiveQuiz error:", error);
    throw error;
  }
}

export async function submitQuiz(
  quizId: string,
  answers: Array<{ question_id: string; selected_answer: number; response_time_ms: number; confidence_rating: number }>,
  sessionId?: string
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/quiz/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
        session_id: sessionId,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to submit quiz: ${text}`);
    }

    revalidatePath("/quizzes");
    revalidatePath("/progress");
    return await res.json();
  } catch (error: any) {
    console.error("submitQuiz error:", error);
    throw error;
  }
}

// ==========================================
// 4. SKILLS & STATE
// ==========================================
export async function getWeakSkills(limit: number = 10) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/skills/weak?limit=${limit}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch weak skills: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getWeakSkills error:", error);
    throw error;
  }
}

export async function getUnlockedSkills() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/skills/unlocked`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch unlocked skills: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getUnlockedSkills error:", error);
    throw error;
  }
}

export async function getSkillGraph() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/skills/graph`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch skill graph: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getSkillGraph error:", error);
    throw error;
  }
}

export async function getLearningState() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/state`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch learning state: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getLearningState error:", error);
    throw error;
  }
}

// ==========================================
// 5. RECOMMENDATIONS & DAILY PLAN & BURNOUT & INSIGHTS
// ==========================================
export async function getLearningRecommendations() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/recommendations`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch recommendations: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getLearningRecommendations error:", error);
    throw error;
  }
}

export async function getBurnoutRisk() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/burnout/risk`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch burnout risk: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getBurnoutRisk error:", error);
    throw error;
  }
}

export async function getInsights() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/insights`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch learning insights: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getInsights error:", error);
    throw error;
  }
}

export async function getDailyPlan() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/daily-plan`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch daily plan: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("getDailyPlan error:", error);
    throw error;
  }
}

export async function regenerateDailyPlan(availableMinutes: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/daily-plan/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ available_minutes: availableMinutes }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to regenerate daily plan: ${text}`);
    }

    revalidatePath("/plan");
    return await res.json();
  } catch (error: any) {
    console.error("regenerateDailyPlan error:", error);
    throw error;
  }
}

// ==========================================
// 6. EVENT & SESSION TRACKING
// ==========================================
export async function startStudySession(plannedDurationMinutes: number, deviceType: string = "web") {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/sessions/start`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        planned_duration_minutes: plannedDurationMinutes,
        device_type: deviceType,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to start session: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("startStudySession error:", error);
    throw error;
  }
}

export async function endStudySession(sessionId: string, interruptions: number, completionRate: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/sessions/end`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        session_id: sessionId,
        interruptions,
        completion_rate: completionRate,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to end session: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("endStudySession error:", error);
    throw error;
  }
}

export async function trackLearningEvent(
  eventType: string,
  skillId?: string,
  questionId?: string,
  sessionId?: string,
  payload: Record<string, any> = {}
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`${TESO_API_BASE}/api/adaptive/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event_type: eventType,
        skill_id: skillId,
        question_id: questionId,
        session_id: sessionId,
        payload,
        client_timestamp: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to track learning event: ${text}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error("trackLearningEvent error:", error);
    throw error;
  }
}
