import "server-only";

import { query, sql } from "@/lib/db/client";

export type QuestionOption = {
  id: string; // "A", "B", "C", "D"
  text: string;
};

export type PublicQuestion = {
  id: string;
  course_id: string;
  stem: string;
  options: QuestionOption[];
  teacher_difficulty: number;
};

export type TeacherQuestion = PublicQuestion & {
  correct_option: string;
  explanation: string | null;
  active: boolean;
  created_at: Date;
};

export async function getQuestionForStudent(questionId: string): Promise<PublicQuestion | null> {
  const rows = await query<PublicQuestion>`
    SELECT id, course_id, stem, options, teacher_difficulty
    FROM app.questions
    WHERE id = ${questionId} AND active = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getQuestionAnswerDetails(questionId: string): Promise<{
  correct_option: string;
  explanation: string | null;
} | null> {
  const rows = await query<{ correct_option: string; explanation: string | null }>`
    SELECT correct_option, explanation
    FROM app.questions
    WHERE id = ${questionId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function recordQuestionServe(
  studentId: string,
  questionId: string,
  courseId: string,
  context: "practice" | "review" | "assessment" = "practice",
  sessionId?: string
): Promise<string> {
  const rows = await query<{ id: string }>`
    INSERT INTO app.question_serves (student_id, question_id, course_id, context, session_id, served_at)
    VALUES (${studentId}, ${questionId}, ${courseId}, ${context}, ${sessionId ?? null}, now())
    RETURNING id
  `;
  return rows[0].id;
}

export async function recordAttemptInDb(
  attemptId: string,
  serveId: string,
  studentId: string,
  chosenOption: string
): Promise<{
  id: string;
  is_correct: boolean;
  latency_ms: number;
  question_id: string;
} | null> {
  // Single atomic statement: calculates server-side latency & correctness directly in the database
  const rows = await query<{
    id: string;
    is_correct: boolean;
    latency_ms: number;
    question_id: string;
  }>`
    INSERT INTO app.attempts (
      id, serve_id, student_id, question_id, course_id, session_id,
      chosen_option, is_correct, latency_ms, context, answered_at
    )
    SELECT
      ${attemptId}::uuid,
      s.id,
      s.student_id,
      s.question_id,
      s.course_id,
      s.session_id,
      ${chosenOption},
      (q.correct_option = ${chosenOption}),
      LEAST(GREATEST(ROUND(EXTRACT(EPOCH FROM now() - s.served_at) * 1000), 500), 600000)::int,
      s.context,
      now()
    FROM app.question_serves s
    JOIN app.questions q ON q.id = s.question_id
    WHERE s.id = ${serveId}::uuid AND s.student_id = ${studentId}::uuid
    ON CONFLICT (serve_id) DO NOTHING
    RETURNING id, is_correct, latency_ms, question_id
  `;

  return rows[0] ?? null;
}

export async function createQuestion(params: {
  teacherId: string;
  courseId: string;
  stem: string;
  options: QuestionOption[];
  correctOption: string;
  explanation: string;
  teacherDifficulty: number;
}): Promise<TeacherQuestion> {
  // Ensure the teacher owns this course
  const courseOwners = await query<{ id: string; subject_id: string | null }>`
    SELECT id, subject_id FROM app.courses WHERE id = ${params.courseId} AND teacher_id = ${params.teacherId}
  `;
  if (courseOwners.length === 0) {
    throw new Error("Course not found or unauthorized.");
  }

  const subjectId = courseOwners[0].subject_id;

  const rows = await query<TeacherQuestion>`
    INSERT INTO app.questions (
      course_id, subject_id, author_id, stem, options,
      correct_option, explanation, teacher_difficulty, active
    )
    VALUES (
      ${params.courseId},
      ${subjectId},
      ${params.teacherId},
      ${params.stem},
      ${JSON.stringify(params.options)}::jsonb,
      ${params.correctOption},
      ${params.explanation},
      ${params.teacherDifficulty},
      true
    )
    RETURNING id, course_id, stem, options, teacher_difficulty, correct_option, explanation, active, created_at
  `;

  return rows[0];
}

export async function listQuestionsForTeacher(
  courseId: string,
  teacherId: string
): Promise<TeacherQuestion[]> {
  return query<TeacherQuestion>`
    SELECT q.id, q.course_id, q.stem, q.options, q.teacher_difficulty,
           q.correct_option, q.explanation, q.active, q.created_at
    FROM app.questions q
    JOIN app.courses c ON c.id = q.course_id
    WHERE q.course_id = ${courseId} AND c.teacher_id = ${teacherId}
    ORDER BY q.created_at DESC
  `;
}

export async function deleteQuestionForTeacher(
  questionId: string,
  teacherId: string
): Promise<boolean> {
  const result = await query<{ id: string }>`
    DELETE FROM app.questions
    WHERE id = ${questionId} AND author_id = ${teacherId}
    RETURNING id
  `;
  return result.length > 0;
}
