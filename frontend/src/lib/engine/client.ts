import "server-only";

export type NextQuestionResponse = {
  question_id: string;
  reason: string;
};

export type ProcessAttemptResponse = {
  label: string;
  p_mastery: number;
  next_due_at: string | null;
};

export type DueReviewItem = {
  question_id: string;
  retrievability: number;
  due_at: string;
};

export type TopicMasteryItem = {
  topic_id: string;
  topic_name: string;
  p_mastery: number;
  status: "weak" | "progressing" | "mastered";
};

export type StudentProgressResponse = {
  student_id: string;
  theta: number;
  review_load: number;
  topic_mastery: TopicMasteryItem[];
  weak_topics: string[];
};

export type PeerDiagnosticItem = {
  question_id: string;
  stem: string;
  chosen_option: string;
  correct_option: string;
  peer_facility: number;
  latency_ms: number;
  diagnosis_label: string;
};

export type PeerDiagnosticResponse = {
  session_id?: string | null;
  missed_peer_easy: PeerDiagnosticItem[];
  cohort_hard: PeerDiagnosticItem[];
};

export type ItemStatItem = {
  question_id: string;
  stem: string;
  facility: number;
  discrimination: number;
  attempts_count: number;
  flags: string[];
};

export type ItemStatsResponse = {
  course_id: string;
  items: ItemStatItem[];
};

export type StudentZScoreItem = {
  student_id: string;
  student_name?: string | null;
  student_email?: string | null;
  subject_z: Record<string, number>;
  composite_z: number;
  band: {
    p10: number;
    p50: number;
    p90: number;
  };
  flags: string[];
};

export type ZScoresResponse = {
  course_id: string;
  students: StudentZScoreItem[];
};

export type JobRunResponse = {
  job: string;
  status: string;
  message: string;
  details?: Record<string, unknown>;
};

function getEngineConfig() {
  const baseUrl = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000";
  const apiKey = process.env.ENGINE_API_KEY || "dev-secret-change-me";
  return { baseUrl, apiKey };
}

async function requestEngine<T>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const { baseUrl, apiKey } = getEngineConfig();
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers || {});
  headers.set("X-Engine-Key", apiKey);
  headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Engine API error [${res.status}] ${path}: ${errorText || res.statusText}`);
  }

  return (await res.json()) as T;
}

export const engineClient = {
  async getNextQuestion(studentId: string, courseId: string): Promise<NextQuestionResponse> {
    return requestEngine<NextQuestionResponse>("/v1/practice/next", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, course_id: courseId }),
    });
  },

  async processAttempt(attemptId: string): Promise<ProcessAttemptResponse> {
    return requestEngine<ProcessAttemptResponse>("/v1/attempts/process", {
      method: "POST",
      body: JSON.stringify({ attempt_id: attemptId }),
    });
  },

  async getDueReviews(studentId: string, limit = 20): Promise<DueReviewItem[]> {
    return requestEngine<DueReviewItem[]>(
      `/v1/reviews/due?student_id=${encodeURIComponent(studentId)}&limit=${limit}`
    );
  },

  async getStudentProgress(studentId: string, courseId?: string): Promise<StudentProgressResponse> {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
    return requestEngine<StudentProgressResponse>(
      `/v1/students/${encodeURIComponent(studentId)}/progress${query}`
    );
  },

  async getPeerDiagnostic(studentId: string, sessionId?: string): Promise<PeerDiagnosticResponse> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    return requestEngine<PeerDiagnosticResponse>(
      `/v1/students/${encodeURIComponent(studentId)}/peer-diagnostic${query}`
    );
  },

  async getItemStats(courseId: string): Promise<ItemStatsResponse> {
    return requestEngine<ItemStatsResponse>(
      `/v1/courses/${encodeURIComponent(courseId)}/item-stats`
    );
  },

  async getCourseZScores(courseId: string, linkedCourseIds?: string[]): Promise<ZScoresResponse> {
    const query = linkedCourseIds && linkedCourseIds.length > 0
      ? `?linked_course_ids=${encodeURIComponent(linkedCourseIds.join(","))}`
      : "";
    return requestEngine<ZScoresResponse>(
      `/v1/courses/${encodeURIComponent(courseId)}/zscores${query}`
    );
  },

  async runJob(name: string): Promise<JobRunResponse> {
    return requestEngine<JobRunResponse>(
      `/v1/admin/jobs/${encodeURIComponent(name)}`,
      { method: "POST" }
    );
  },
};
