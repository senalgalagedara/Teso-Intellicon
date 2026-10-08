import "server-only";

import { query, sql } from "@/lib/db/client";

export type AdminSubjectRow = {
  id: string;
  name: string;
  stream: string;
  created_at: Date;
  question_count: number;
};

export type QuestionOption = {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
};

export type AdminQuestionRow = {
  id: string;
  subject_id: string;
  subject_name: string;
  stem: string;
  options: QuestionOption[];
  correct_option: string;
  explanation: string | null;
  active: boolean;
  created_at: Date;
};

let initPromise: Promise<void> | null = null;

export async function ensureAdminTables(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await sql`CREATE SCHEMA IF NOT EXISTS app`;

      await sql`
        CREATE TABLE IF NOT EXISTS app.subjects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          stream TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS app.questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID,
          subject_id UUID REFERENCES app.subjects(id) ON DELETE CASCADE,
          topic_id UUID,
          author_id UUID NOT NULL,
          stem TEXT NOT NULL,
          options JSONB NOT NULL,
          correct_option TEXT NOT NULL,
          explanation TEXT,
          teacher_difficulty INT NOT NULL DEFAULT 2,
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      try {
        await sql`
          ALTER TABLE app.questions
          ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES app.subjects(id) ON DELETE CASCADE
        `;
      } catch {
        // already added or existing
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function listAdminSubjects(): Promise<AdminSubjectRow[]> {
  await ensureAdminTables();
  return query<AdminSubjectRow>`
    SELECT
      s.id,
      s.name,
      s.stream,
      s.created_at,
      count(q.id)::int AS question_count
    FROM app.subjects s
    LEFT JOIN app.questions q ON q.subject_id = s.id
    GROUP BY s.id, s.name, s.stream, s.created_at
    ORDER BY s.name ASC
  `;
}

export async function createAdminSubject(
  name: string,
  stream = "General"
): Promise<{ ok: boolean; error?: string; id?: string }> {
  await ensureAdminTables();
  const trimmedName = name.trim();
  const trimmedStream = stream.trim() || "General";

  if (!trimmedName) {
    return { ok: false, error: "Subject name cannot be empty." };
  }

  try {
    const rows = await query<{ id: string }>`
      INSERT INTO app.subjects (name, stream)
      VALUES (${trimmedName}, ${trimmedStream})
      ON CONFLICT (name) DO UPDATE SET stream = EXCLUDED.stream
      RETURNING id
    `;
    return { ok: true, id: rows[0]?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create subject.";
    return { ok: false, error: message };
  }
}

export async function deleteAdminSubject(subjectId: string): Promise<boolean> {
  await ensureAdminTables();
  const rows = await query<{ id: string }>`
    DELETE FROM app.subjects WHERE id = ${subjectId} RETURNING id
  `;
  return rows.length > 0;
}

export async function listAdminQuestions(subjectId?: string): Promise<AdminQuestionRow[]> {
  await ensureAdminTables();
  if (subjectId && subjectId !== "all") {
    return query<AdminQuestionRow>`
      SELECT
        q.id,
        q.subject_id,
        s.name AS subject_name,
        q.stem,
        q.options,
        q.correct_option,
        q.explanation,
        q.active,
        q.created_at
      FROM app.questions q
      JOIN app.subjects s ON s.id = q.subject_id
      WHERE q.subject_id = ${subjectId}
      ORDER BY q.created_at DESC
    `;
  }

  return query<AdminQuestionRow>`
    SELECT
      q.id,
      coalesce(q.subject_id::text, '') AS subject_id,
      coalesce(s.name, 'Unassigned') AS subject_name,
      q.stem,
      q.options,
      q.correct_option,
      q.explanation,
      q.active,
      q.created_at
    FROM app.questions q
    LEFT JOIN app.subjects s ON s.id = q.subject_id
    ORDER BY q.created_at DESC
  `;
}

export async function createAdminQuestion(params: {
  subjectId: string;
  authorId: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  await ensureAdminTables();

  const stem = params.stem.trim();
  const optA = params.optionA.trim();
  const optB = params.optionB.trim();
  const optC = params.optionC.trim();
  const optD = params.optionD.trim();
  const correct = params.correctOption.trim().toUpperCase();

  if (!stem) return { ok: false, error: "Question text is required." };
  if (!optA || !optB || !optC || !optD) {
    return { ok: false, error: "All 4 answer options (A, B, C, D) are required." };
  }
  if (!["A", "B", "C", "D"].includes(correct)) {
    return { ok: false, error: "Correct answer must be A, B, C, or D." };
  }

  const options: QuestionOption[] = [
    { id: "A", text: optA },
    { id: "B", text: optB },
    { id: "C", text: optC },
    { id: "D", text: optD },
  ];

  try {
    const rows = await query<{ id: string }>`
      INSERT INTO app.questions (
        subject_id, author_id, stem, options, correct_option, explanation, teacher_difficulty, active
      )
      VALUES (
        ${params.subjectId},
        ${params.authorId},
        ${stem},
        ${JSON.stringify(options)}::jsonb,
        ${correct},
        ${params.explanation?.trim() || null},
        2,
        true
      )
      RETURNING id
    `;
    return { ok: true, id: rows[0]?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create question.";
    return { ok: false, error: message };
  }
}

export async function deleteAdminQuestion(questionId: string): Promise<boolean> {
  await ensureAdminTables();
  const rows = await query<{ id: string }>`
    DELETE FROM app.questions WHERE id = ${questionId} RETURNING id
  `;
  return rows.length > 0;
}

export type BatchQuestionInput = {
  subjectId: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
};

export async function batchApproveAndCreateAdminQuestions(
  authorId: string,
  items: BatchQuestionInput[]
): Promise<{ inserted: number; errors: string[] }> {
  await ensureAdminTables();

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const res = await createAdminQuestion({
      ...item,
      authorId,
    });

    if (res.ok) {
      inserted++;
    } else {
      errors.push(`Row ${i + 1}: ${res.error || "Unknown error"}`);
    }
  }

  return { inserted, errors };
}

export async function getAdminOverviewStats(): Promise<{
  subjectCount: number;
  questionCount: number;
}> {
  await ensureAdminTables();

  const subjects = await query<{ count: number }>`
    SELECT count(*)::int AS count FROM app.subjects
  `;
  const questions = await query<{ count: number }>`
    SELECT count(*)::int AS count FROM app.questions
  `;

  return {
    subjectCount: subjects[0]?.count ?? 0,
    questionCount: questions[0]?.count ?? 0,
  };
}
