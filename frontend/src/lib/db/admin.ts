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

let leaderboardInitPromise: Promise<void> | null = null;

export async function ensureLeaderboardTables(): Promise<void> {
  if (!leaderboardInitPromise) {
    leaderboardInitPromise = (async () => {
      await ensureAdminTables();
      await sql`
        CREATE TABLE IF NOT EXISTS app.subject_leaderboards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subject_id UUID NOT NULL REFERENCES app.subjects(id) ON DELETE CASCADE,
          student_id TEXT NOT NULL,
          student_name TEXT NOT NULL DEFAULT 'Student',
          student_email TEXT NOT NULL DEFAULT '',
          score_percentage NUMERIC NOT NULL DEFAULT 0,
          total_questions INT NOT NULL DEFAULT 0,
          correct_answers INT NOT NULL DEFAULT 0,
          session_id TEXT,
          achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (subject_id, student_id)
        )
      `;
      try {
        await sql`
          CREATE INDEX IF NOT EXISTS subject_leaderboards_subject_idx 
            ON app.subject_leaderboards (subject_id, score_percentage DESC, achieved_at ASC)
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS subject_leaderboards_student_idx 
            ON app.subject_leaderboards (student_id)
        `;
      } catch {
        // Safe fallback if index already exists
      }
    })().catch((err) => {
      leaderboardInitPromise = null;
      throw err;
    });
  }
  return leaderboardInitPromise;
}

export type LeaderboardEntry = {
  rank: number;
  id: string;
  subject_id: string;
  subject_name: string;
  stream: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
  achieved_at: Date;
};

export async function recordLeaderboardScore(params: {
  subjectId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  scorePercentage: number;
  totalQuestions: number;
  correctAnswers: number;
  sessionId?: string;
}): Promise<void> {
  await ensureLeaderboardTables();

  const name = params.studentName?.trim() || "Student";
  const email = params.studentEmail?.trim() || "";

  await sql`
    INSERT INTO app.subject_leaderboards (
      subject_id, student_id, student_name, student_email,
      score_percentage, total_questions, correct_answers, session_id,
      achieved_at, updated_at
    )
    VALUES (
      ${params.subjectId},
      ${params.studentId},
      ${name},
      ${email},
      ${params.scorePercentage},
      ${params.totalQuestions},
      ${params.correctAnswers},
      ${params.sessionId ?? null},
      now(),
      now()
    )
    ON CONFLICT (subject_id, student_id) DO UPDATE
      SET
        student_name = CASE WHEN EXCLUDED.student_name <> 'Student' THEN EXCLUDED.student_name ELSE app.subject_leaderboards.student_name END,
        student_email = CASE WHEN EXCLUDED.student_email <> '' THEN EXCLUDED.student_email ELSE app.subject_leaderboards.student_email END,
        score_percentage = GREATEST(app.subject_leaderboards.score_percentage, EXCLUDED.score_percentage),
        total_questions = CASE 
          WHEN EXCLUDED.score_percentage >= app.subject_leaderboards.score_percentage THEN EXCLUDED.total_questions 
          ELSE app.subject_leaderboards.total_questions 
        END,
        correct_answers = CASE 
          WHEN EXCLUDED.score_percentage >= app.subject_leaderboards.score_percentage THEN EXCLUDED.correct_answers 
          ELSE app.subject_leaderboards.correct_answers 
        END,
        session_id = CASE 
          WHEN EXCLUDED.score_percentage >= app.subject_leaderboards.score_percentage THEN EXCLUDED.session_id 
          ELSE app.subject_leaderboards.session_id 
        END,
        achieved_at = CASE 
          WHEN EXCLUDED.score_percentage >= app.subject_leaderboards.score_percentage THEN now() 
          ELSE app.subject_leaderboards.achieved_at 
        END,
        updated_at = now()
  `;
}

/**
 * Scans practice sessions from app.custom_sessions and synchronizes them into app.subject_leaderboards
 * so past and newly completed sessions appear on the leaderboard automatically.
 */
export async function syncLeaderboardFromSessions(): Promise<number> {
  await ensureLeaderboardTables();

  try {
    const sessions = await query<{
      id: string;
      student_id: string;
      subject_id: string;
      answers: any;
      started_at: Date;
    }>`
      SELECT id, student_id, subject_id::text, answers, started_at
      FROM app.custom_sessions
      WHERE answers IS NOT NULL AND answers <> '{}'::jsonb
    `;

    if (!sessions || sessions.length === 0) return 0;

    // Get user names mapping if available
    let usersMap = new Map<string, { name: string; email: string }>();
    try {
      const users = await query<{ id: string; name: string | null; email: string }>`
        SELECT id::text, name, email FROM neon_auth."user"
      `;
      for (const u of users) {
        usersMap.set(u.id, { name: u.name || u.email.split("@")[0], email: u.email });
      }
    } catch {
      // ignore if neon_auth not available
    }

    let syncedCount = 0;
    for (const s of sessions) {
      let answers = s.answers;
      if (typeof answers === "string") {
        try {
          answers = JSON.parse(answers);
        } catch {
          continue;
        }
      }
      if (!answers || typeof answers !== "object") continue;

      const keys = Object.keys(answers);
      const answeredCount = keys.length;
      if (answeredCount === 0) continue;

      let correctCount = 0;
      for (const k of keys) {
        if (answers[k]?.is_correct) correctCount++;
      }

      const scorePercentage = Math.round((correctCount / answeredCount) * 100);
      const userMeta = usersMap.get(s.student_id);

      await recordLeaderboardScore({
        subjectId: s.subject_id,
        studentId: s.student_id,
        studentName: userMeta?.name || `Student (${s.student_id.slice(0, 6)})`,
        studentEmail: userMeta?.email || "",
        scorePercentage,
        totalQuestions: answeredCount,
        correctAnswers: correctCount,
        sessionId: s.id,
      });
      syncedCount++;
    }

    return syncedCount;
  } catch (err) {
    console.error("[syncLeaderboardFromSessions] Error syncing sessions:", err);
    return 0;
  }
}

export async function listSubjectLeaderboard(subjectId?: string): Promise<LeaderboardEntry[]> {
  await ensureLeaderboardTables();

  // Run lightweight sync to ensure newest sessions are reflected
  try {
    await syncLeaderboardFromSessions();
  } catch {
    // Continue even if sync fails
  }

  let rows: Array<{
    id: string;
    subject_id: string;
    subject_name: string;
    stream: string;
    student_id: string;
    student_name: string;
    student_email: string;
    score_percentage: number;
    total_questions: number;
    correct_answers: number;
    achieved_at: Date;
  }> = [];

  if (subjectId && subjectId !== "all") {
    rows = await query<{
      id: string;
      subject_id: string;
      subject_name: string;
      stream: string;
      student_id: string;
      student_name: string;
      student_email: string;
      score_percentage: number;
      total_questions: number;
      correct_answers: number;
      achieved_at: Date;
    }>`
      SELECT
        l.id,
        l.subject_id::text,
        s.name AS subject_name,
        s.stream,
        l.student_id,
        l.student_name,
        l.student_email,
        round(l.score_percentage)::int AS score_percentage,
        l.total_questions,
        l.correct_answers,
        l.achieved_at
      FROM app.subject_leaderboards l
      JOIN app.subjects s ON s.id = l.subject_id
      WHERE l.subject_id = ${subjectId}::uuid
      ORDER BY l.score_percentage DESC, l.correct_answers DESC, l.achieved_at ASC
      LIMIT 100
    `;
  } else {
    rows = await query<{
      id: string;
      subject_id: string;
      subject_name: string;
      stream: string;
      student_id: string;
      student_name: string;
      student_email: string;
      score_percentage: number;
      total_questions: number;
      correct_answers: number;
      achieved_at: Date;
    }>`
      SELECT
        l.id,
        l.subject_id::text,
        s.name AS subject_name,
        s.stream,
        l.student_id,
        l.student_name,
        l.student_email,
        round(l.score_percentage)::int AS score_percentage,
        l.total_questions,
        l.correct_answers,
        l.achieved_at
      FROM app.subject_leaderboards l
      JOIN app.subjects s ON s.id = l.subject_id
      ORDER BY l.score_percentage DESC, l.correct_answers DESC, l.achieved_at ASC
      LIMIT 100
    `;
  }

  return rows.map((r, index) => ({
    ...r,
    rank: index + 1,
  }));
}

export type RegisteredStudent = {
  id: string;
  name: string;
  email: string;
  role: string;
  registered_at: Date;
  total_sessions: number;
  completed_sessions: number;
  total_questions_attempted: number;
  total_correct: number;
  accuracy_percentage: number;
  high_score_percentage: number;
  top_subject_name: string | null;
  last_active_at: Date | null;
  subjects_practiced: string[];
};

export async function listRegisteredStudents(): Promise<RegisteredStudent[]> {
  await ensureAdminTables();
  await ensureLeaderboardTables();

  // 1. Fetch base students from auth / roles
  type BaseUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    registered_at: Date;
  };

  let baseUsers: BaseUser[] = [];

  try {
    const rows = await query<{
      id: string;
      name: string | null;
      email: string;
      role: string | null;
      registered_at: Date;
    }>`
      SELECT
        u.id::text AS id,
        u.name,
        u.email,
        coalesce(r.role::text, 'student') AS role,
        coalesce(r.created_at, now()) AS registered_at
      FROM neon_auth."user" u
      LEFT JOIN app.user_roles r ON r.user_id = u.id
      WHERE coalesce(r.role::text, 'student') = 'student'
      ORDER BY coalesce(r.created_at, now()) DESC
    `;

    baseUsers = rows.map((r) => ({
      id: r.id,
      name: r.name?.trim() || r.email.split("@")[0] || "Student",
      email: r.email,
      role: r.role || "student",
      registered_at: r.registered_at,
    }));
  } catch {
    try {
      const roleRows = await query<{
        user_id: string;
        email: string;
        role: string;
        created_at: Date;
      }>`
        SELECT user_id::text, email, role::text, created_at
        FROM app.user_roles
        WHERE role = 'student'
        ORDER BY created_at DESC
      `;
      baseUsers = roleRows.map((r) => ({
        id: r.user_id,
        name: r.email.split("@")[0] || "Student",
        email: r.email,
        role: r.role,
        registered_at: r.created_at,
      }));
    } catch {
      baseUsers = [];
    }
  }

  // 2. Fetch custom sessions stats per student
  type SessionRow = {
    id: string;
    student_id: string;
    subject_id: string;
    subject_name: string | null;
    status: string;
    answers: any;
    started_at: Date;
  };

  let sessions: SessionRow[] = [];
  try {
    sessions = await query<SessionRow>`
      SELECT
        cs.id,
        cs.student_id,
        cs.subject_id::text,
        s.name AS subject_name,
        cs.status,
        cs.answers,
        cs.started_at
      FROM app.custom_sessions cs
      LEFT JOIN app.subjects s ON s.id = cs.subject_id
      ORDER BY cs.started_at DESC
    `;
  } catch {
    sessions = [];
  }

  // Group session stats by student_id
  const studentStats = new Map<
    string,
    {
      totalSessions: number;
      completedSessions: number;
      totalQuestions: number;
      totalCorrect: number;
      highScore: number;
      topSubject: string | null;
      lastActive: Date | null;
      subjects: Set<string>;
    }
  >();

  for (const s of sessions) {
    let stat = studentStats.get(s.student_id);
    if (!stat) {
      stat = {
        totalSessions: 0,
        completedSessions: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        highScore: 0,
        topSubject: null,
        lastActive: null,
        subjects: new Set<string>(),
      };
      studentStats.set(s.student_id, stat);
    }

    stat.totalSessions++;
    if (s.status === "submitted") {
      stat.completedSessions++;
    }

    if (s.subject_name) {
      stat.subjects.add(s.subject_name);
    }

    if (!stat.lastActive || new Date(s.started_at) > new Date(stat.lastActive)) {
      stat.lastActive = new Date(s.started_at);
    }

    let answers = s.answers;
    if (typeof answers === "string") {
      try {
        answers = JSON.parse(answers);
      } catch {
        answers = null;
      }
    }

    if (answers && typeof answers === "object") {
      const keys = Object.keys(answers);
      const sessionQCount = keys.length;
      let sessionCorrectCount = 0;
      for (const k of keys) {
        if (answers[k]?.is_correct) sessionCorrectCount++;
      }

      stat.totalQuestions += sessionQCount;
      stat.totalCorrect += sessionCorrectCount;

      if (sessionQCount > 0) {
        const sessionPct = Math.round((sessionCorrectCount / sessionQCount) * 100);
        if (sessionPct >= stat.highScore) {
          stat.highScore = sessionPct;
          if (s.subject_name) stat.topSubject = s.subject_name;
        }
      }
    }
  }

  // 3. Merge baseUsers with studentStats
  const knownStudentIds = new Set(baseUsers.map((u) => u.id));
  const result: RegisteredStudent[] = [];

  for (const u of baseUsers) {
    const stat = studentStats.get(u.id);
    const totalQ = stat?.totalQuestions ?? 0;
    const totalC = stat?.totalCorrect ?? 0;
    const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

    result.push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      registered_at: u.registered_at,
      total_sessions: stat?.totalSessions ?? 0,
      completed_sessions: stat?.completedSessions ?? 0,
      total_questions_attempted: totalQ,
      total_correct: totalC,
      accuracy_percentage: accuracy,
      high_score_percentage: stat?.highScore ?? 0,
      top_subject_name: stat?.topSubject ?? null,
      last_active_at: stat?.lastActive ?? null,
      subjects_practiced: stat ? Array.from(stat.subjects) : [],
    });
  }

  // Add students who have practice sessions but might not yet have an app.user_roles row
  for (const [studentId, stat] of studentStats.entries()) {
    if (!knownStudentIds.has(studentId)) {
      const totalQ = stat.totalQuestions;
      const totalC = stat.totalCorrect;
      const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

      result.push({
        id: studentId,
        name: studentId.startsWith("dev-") ? `Dev Student (${studentId})` : `Student (${studentId.slice(0, 8)})`,
        email: studentId.includes("@") ? studentId : `student-${studentId.slice(0, 6)}@teso.lk`,
        role: "student",
        registered_at: stat.lastActive ?? new Date(),
        total_sessions: stat.totalSessions,
        completed_sessions: stat.completedSessions,
        total_questions_attempted: totalQ,
        total_correct: totalC,
        accuracy_percentage: accuracy,
        high_score_percentage: stat.highScore,
        top_subject_name: stat.topSubject,
        last_active_at: stat.lastActive,
        subjects_practiced: Array.from(stat.subjects),
      });
    }
  }

  // Sort by last active or registered_at DESC
  return result.sort((a, b) => {
    const timeA = a.last_active_at ? new Date(a.last_active_at).getTime() : new Date(a.registered_at).getTime();
    const timeB = b.last_active_at ? new Date(b.last_active_at).getTime() : new Date(b.registered_at).getTime();
    return timeB - timeA;
  });
}

export async function getLeaderboardStats(subjectId?: string): Promise<{
  totalCompetitors: number;
  topScore: number;
  avgScore: number;
  subjectChampion: string | null;
}> {
  await ensureLeaderboardTables();

  try {
    let rows: Array<{
      total_students: number;
      top_score: number;
      avg_score: number;
      champion: string | null;
    }>;

    if (subjectId && subjectId !== "all") {
      rows = await query<{
        total_students: number;
        top_score: number;
        avg_score: number;
        champion: string | null;
      }>`
        SELECT
          count(*)::int AS total_students,
          coalesce(max(score_percentage), 0)::int AS top_score,
          coalesce(round(avg(score_percentage)), 0)::int AS avg_score,
          (
            SELECT student_name FROM app.subject_leaderboards
            WHERE subject_id = ${subjectId}::uuid
            ORDER BY score_percentage DESC, achieved_at ASC LIMIT 1
          ) AS champion
        FROM app.subject_leaderboards
        WHERE subject_id = ${subjectId}::uuid
      `;
    } else {
      rows = await query<{
        total_students: number;
        top_score: number;
        avg_score: number;
        champion: string | null;
      }>`
        SELECT
          count(DISTINCT student_id)::int AS total_students,
          coalesce(max(score_percentage), 0)::int AS top_score,
          coalesce(round(avg(score_percentage)), 0)::int AS avg_score,
          (
            SELECT student_name FROM app.subject_leaderboards
            ORDER BY score_percentage DESC, achieved_at ASC LIMIT 1
          ) AS champion
        FROM app.subject_leaderboards
      `;
    }

    return {
      totalCompetitors: rows[0]?.total_students ?? 0,
      topScore: rows[0]?.top_score ?? 0,
      avgScore: rows[0]?.avg_score ?? 0,
      subjectChampion: rows[0]?.champion ?? null,
    };
  } catch {
    return {
      totalCompetitors: 0,
      topScore: 0,
      avgScore: 0,
      subjectChampion: null,
    };
  }
}

export async function getAdminOverviewStats(): Promise<{
  subjectCount: number;
  questionCount: number;
  studentCount: number;
  leaderboardCount: number;
}> {
  await ensureAdminTables();
  await ensureLeaderboardTables();

  const subjects = await query<{ count: number }>`
    SELECT count(*)::int AS count FROM app.subjects
  `;
  const questions = await query<{ count: number }>`
    SELECT count(*)::int AS count FROM app.questions
  `;

  let studentCount = 0;
  try {
    const students = await query<{ count: number }>`
      SELECT count(*)::int AS count FROM app.user_roles WHERE role = 'student'
    `;
    studentCount = students[0]?.count ?? 0;
  } catch {
    studentCount = 0;
  }

  let leaderboardCount = 0;
  try {
    const leaderboards = await query<{ count: number }>`
      SELECT count(*)::int AS count FROM app.subject_leaderboards
    `;
    leaderboardCount = leaderboards[0]?.count ?? 0;
  } catch {
    leaderboardCount = 0;
  }

  return {
    subjectCount: subjects[0]?.count ?? 0,
    questionCount: questions[0]?.count ?? 0,
    studentCount,
    leaderboardCount,
  };
}
