import "server-only";

import { query, sql } from "@/lib/db/client";
import { ensureAdminTables } from "@/lib/db/admin";
import type {
  Paper,
  Exam,
  Question,
  CheckAnswerResult,
  Result,
  Session,
} from "@/lib/assessment-types";

export async function ensureCustomSessionTables(): Promise<void> {
  await ensureAdminTables();
  await sql`
    CREATE TABLE IF NOT EXISTS app.custom_sessions (
      id TEXT PRIMARY KEY,
      subject_id UUID NOT NULL REFERENCES app.subjects(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'in_progress',
      answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      submitted_at TIMESTAMPTZ
    )
  `;
}

/**
 * Returns dynamic papers generated from admin-created subjects in app.subjects
 * that have active questions in app.questions.
 */
export async function getCustomPapers(): Promise<Paper[]> {
  try {
    await ensureCustomSessionTables();

    const rows = await query<{
      id: string;
      name: string;
      stream: string;
      question_count: number;
    }>`
      SELECT
        s.id,
        s.name,
        s.stream,
        count(q.id)::int AS question_count
      FROM app.subjects s
      JOIN app.questions q ON q.subject_id = s.id AND q.active = true
      GROUP BY s.id, s.name, s.stream
      HAVING count(q.id) > 0
      ORDER BY s.name ASC
    `;

    const papers: Paper[] = [];
    const languages = ["en", "si", "ta"];

    for (const r of rows) {
      for (const lang of languages) {
        papers.push({
          id: `subject-${r.id}-${lang}`,
          title: r.name,
          version: 1,
          is_development: false,
          question_count: r.question_count,
          subject_id: r.id,
          subject_name: r.name,
          content_language: lang,
        });
      }
    }

    return papers;
  } catch (err) {
    console.error("[getCustomPapers] Error fetching custom papers:", err);
    return [];
  }
}

export function parseSubjectIdFromPaperId(paperId: string): string | null {
  if (paperId.startsWith("subject-")) {
    const stripped = paperId.replace(/^subject-/, "");
    // Remove language suffix if present, e.g. -en, -si, -ta
    const clean = stripped.replace(/-(en|si|ta)$/, "");
    return clean;
  }
  return null;
}

export async function isCustomSession(sessionId: string): Promise<boolean> {
  try {
    await ensureCustomSessionTables();
    const rows = await query<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM app.custom_sessions WHERE id = ${sessionId}
      ) AS exists
    `;
    return rows[0]?.exists ?? false;
  } catch {
    return false;
  }
}

export async function startCustomSession(
  subjectId: string,
  studentId: string,
  language = "en"
): Promise<{ session_id: string; status: string } | null> {
  await ensureCustomSessionTables();

  const subjects = await query<{ id: string }>`
    SELECT id FROM app.subjects WHERE id = ${subjectId}
  `;
  if (subjects.length === 0) return null;

  const sessionId = crypto.randomUUID();

  await sql`
    INSERT INTO app.custom_sessions (id, subject_id, student_id, language, status)
    VALUES (${sessionId}, ${subjectId}, ${studentId}, ${language}, 'in_progress')
  `;

  return { session_id: sessionId, status: "in_progress" };
}

export async function getCustomExam(sessionId: string): Promise<Exam | null> {
  await ensureCustomSessionTables();

  const sessRows = await query<{
    id: string;
    subject_id: string;
    student_id: string;
    language: string;
    status: "in_progress" | "submitted";
    answers: Record<string, { selected_option: string; is_correct: boolean }>;
  }>`
    SELECT id, subject_id, student_id, language, status, answers
    FROM app.custom_sessions
    WHERE id = ${sessionId}
  `;

  if (sessRows.length === 0) return null;
  const session = sessRows[0];

  const qRows = await query<{
    id: string;
    stem: string;
    options: any;
    correct_option: string;
    explanation: string | null;
  }>`
    SELECT id, stem, options, correct_option, explanation
    FROM app.questions
    WHERE subject_id = ${session.subject_id} AND active = true
    ORDER BY created_at ASC
  `;

  const questions: Question[] = qRows.map((q) => {
    let opts = q.options;
    if (typeof opts === "string") {
      try {
        opts = JSON.parse(opts);
      } catch {
        opts = [];
      }
    }
    return {
      id: q.id,
      version: 1,
      text: q.stem,
      marks: 1,
      media_ids: [],
      options: (Array.isArray(opts) ? opts : []).map((o: any) => ({
        id: String(o.id ?? ""),
        text: String(o.text ?? ""),
        media_ids: [],
      })),
    };
  });

  const drafts: Record<string, string | null> = {};
  if (session.answers) {
    for (const [qid, ans] of Object.entries(session.answers)) {
      drafts[qid] = ans.selected_option;
    }
  }

  return {
    session_id: session.id,
    status: session.status,
    language: session.language,
    is_development: false,
    questions,
    plan: null,
    drafts,
  };
}

export async function checkCustomAnswer(
  sessionId: string,
  questionId: string,
  selectedOption: string
): Promise<CheckAnswerResult | null> {
  await ensureCustomSessionTables();

  const qRows = await query<{
    id: string;
    correct_option: string;
    explanation: string | null;
  }>`
    SELECT id, correct_option, explanation
    FROM app.questions
    WHERE id = ${questionId}
  `;

  if (qRows.length === 0) return null;
  const q = qRows[0];

  const isCorrect =
    q.correct_option.trim().toUpperCase() === selectedOption.trim().toUpperCase();

  const answerEntry = {
    selected_option: selectedOption,
    is_correct: isCorrect,
    answered_at: Date.now(),
  };

  await sql`
    UPDATE app.custom_sessions
    SET answers = jsonb_set(
      answers,
      ${`{${questionId}}`},
      ${JSON.stringify(answerEntry)}::jsonb,
      true
    )
    WHERE id = ${sessionId}
  `;

  return {
    question_id: questionId,
    selected_option: selectedOption,
    correct_option_id: q.correct_option,
    is_correct: isCorrect,
    marks: isCorrect ? 1 : 0,
    total_marks: 1,
    base_explanation:
      q.explanation || `The correct answer is Option ${q.correct_option}.`,
    resources: [],
  };
}

export async function submitCustomSession(sessionId: string): Promise<boolean> {
  await ensureCustomSessionTables();
  const rows = await query<{ id: string }>`
    UPDATE app.custom_sessions
    SET status = 'submitted', submitted_at = now()
    WHERE id = ${sessionId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getCustomResults(sessionId: string): Promise<Result | null> {
  await ensureCustomSessionTables();

  const sessRows = await query<{
    id: string;
    subject_id: string;
    answers: Record<string, { selected_option: string; is_correct: boolean }>;
  }>`
    SELECT id, subject_id, answers
    FROM app.custom_sessions
    WHERE id = ${sessionId}
  `;

  if (sessRows.length === 0) return null;
  const sess = sessRows[0];

  const qRows = await query<{
    id: string;
    stem: string;
    options: any;
    correct_option: string;
    explanation: string | null;
  }>`
    SELECT id, stem, options, correct_option, explanation
    FROM app.questions
    WHERE subject_id = ${sess.subject_id}
  `;

  const answers = sess.answers || {};
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.is_correct).length;
  const incorrectCount = answeredCount - correctCount;

  return {
    session_id: sessionId,
    score: {
      correct: correctCount,
      incorrect: incorrectCount,
      unanswered: 0,
      awarded_marks: correctCount,
      total_marks: answeredCount || 1,
      percentage: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
    },
    analysis_status: "completed",
    is_development: false,
    concepts: [],
    revision_concept_ids: [],
    questions: Object.entries(answers).map(([qid, ans]) => {
      const q = qRows.find((item) => item.id === qid);
      let opts = q?.options;
      if (typeof opts === "string") {
        try {
          opts = JSON.parse(opts);
        } catch {
          opts = [];
        }
      }
      return {
        question: {
          id: qid,
          version: 1,
          text: q?.stem || "Question",
          marks: 1,
          media_ids: [],
          options: (Array.isArray(opts) ? opts : []).map((o: any) => ({
            id: String(o.id ?? ""),
            text: String(o.text ?? ""),
            media_ids: [],
          })),
          correct_option_id: q?.correct_option || "",
          solution_media_ids: [],
        },
        answer: {
          selected_option: ans.selected_option,
          correct: ans.is_correct,
          marks: ans.is_correct ? 1 : 0,
        },
        base_explanation: q?.explanation || "",
        analysis: null,
        resources: [],
        success_rate: {
          percentage: 100,
          numerator: 1,
          denominator: 1,
          sample_label: "Pool",
          population: "All Students",
        },
      };
    }),
    interpretation: `Practice session complete! You scored ${correctCount} out of ${answeredCount}.`,
  };
}

export async function getCustomSessions(studentId: string): Promise<Session[]> {
  try {
    await ensureCustomSessionTables();
    const rows = await query<{
      id: string;
      subject_id: string;
      status: string;
      started_at: Date;
    }>`
      SELECT id, subject_id, status, started_at
      FROM app.custom_sessions
      WHERE student_id = ${studentId}
      ORDER BY started_at DESC
      LIMIT 50
    `;

    return rows.map((r) => ({
      id: r.id,
      paper_id: `subject-${r.subject_id}`,
      status: r.status,
      started_at: Math.floor(new Date(r.started_at).getTime() / 1000),
    }));
  } catch {
    return [];
  }
}
