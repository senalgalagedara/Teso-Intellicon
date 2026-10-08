'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from "@/lib/auth";

async function getDbUser() {
    const firebaseUser = await getCurrentUser();
    if (!firebaseUser || !firebaseUser.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: firebaseUser.email }
    });
    return user;
}

export async function getAvailablePapers() {
  try {
    const papers = await prisma.pastPaper.findMany({
      distinct: ['paperId', 'subjectName', 'paperYear'],
      select: {
        paperId: true,
        subjectName: true,
        paperYear: true,
      },
      orderBy: {
        paperYear: 'desc'
      }
    });

    const tuitionPapers = await prisma.tutionPaper.findMany({
      where: { status: 'UPLOADED' },
      select: {
        id: true,
        title: true,
        code: true,
        category: true,
      }
    });

    const formattedPastPapers = papers.map(p => ({
      id: `${p.subjectName}|${p.paperYear}|${p.paperId}`,
      title: `${p.subjectName} ${p.paperYear}`,
      subject: p.subjectName,
      year: p.paperYear,
      type: 'past-paper' as const,
      downloadUrl: '#'
    }));

    const formattedTuitionPapers = tuitionPapers.map(p => ({
      id: p.id,
      title: p.title,
      subject: p.category || 'Tuition',
      year: new Date().getFullYear(),
      type: 'specific-paper' as const,
      downloadUrl: '#',
      requiresCode: true,
      accessCode: p.code
    }));

    return [...formattedPastPapers, ...formattedTuitionPapers];
  } catch (error) {
    console.error('Error fetching papers:', error);
    return [];
  }
}

export async function getPaperQuestions(fullId: string) {
  try {
    const decodedId = decodeURIComponent(fullId);
    const tuitionPaper = await prisma.tutionPaper.findUnique({
      where: { id: decodedId }
    });

    if (tuitionPaper) {
      const questions = await prisma.tutionPaperDetails.findMany({
        where: { paperId: decodedId },
        orderBy: { questionNumber: 'asc' },
        select: {
          id: true,
          questionNumber: true,
          topic: true,
          difficulty: true,
          questionText: true,
          questionImage: true,
          answer1: true,
          answer2: true,
          answer3: true,
          answer4: true,
          answer5: true,
          answer1Image: true,
          answer2Image: true,
          answer3Image: true,
          answer4Image: true,
          answer5Image: true,
          correctAnswer1: true,
          correctAnswer2: true,
        }
      });

      return questions.map(q => {
        const options = [
          { text: q.answer1, image: q.answer1Image },
          { text: q.answer2, image: q.answer2Image },
          { text: q.answer3, image: q.answer3Image },
          { text: q.answer4, image: q.answer4Image },
          { text: q.answer5, image: q.answer5Image }
        ].filter(opt => opt.text || opt.image);

        return {
          id: q.id,
          questionNumber: q.questionNumber,
          text: q.questionText || q.topic || '', 
          options: options, 
          hasImage: !!q.questionImage || options.some(opt => opt.image),
          questionImage: q.questionImage || null,
          questionImages: q.questionImage ? [q.questionImage] : [],
          answerImages: [], // Removed as answerImage1/2 were removed from DB
          isTuition: true,
          correctAnswer: q.correctAnswer1 !== null ? q.correctAnswer1 - 1 : undefined,
          correctAnswer2: q.correctAnswer2 !== null ? q.correctAnswer2 - 1 : undefined,
        };
      });
    }

    const parts = decodedId.split('|');
    let whereClause: any = { paperId: decodedId };

    if (parts.length === 3) {
      const [subjectName, paperYear, paperId] = parts;
      whereClause = {
        subjectName: { equals: subjectName, mode: 'insensitive' },
        paperYear: parseInt(paperYear),
        paperId: paperId
      };
    }

    // Single robust query that bypasses the non-existent 'QuestionImage' table
    // and focuses on using the 'questionImage' column directly.
    const questions = await prisma.pastPaper.findMany({
      where: whereClause,
      orderBy: { questionNumber: 'asc' },
      select: {
        id: true,
        questionNumber: true,
        questionText: true,
        questionImage: true,
        answer1: true,
        answer2: true,
        answer3: true,
        answer4: true,
        answer5: true,
        answer1Image: true,
        answer2Image: true,
        answer3Image: true,
        answer4Image: true,
        answer5Image: true,
        correctAnswer: true,
        correctAnswer2: true,
      }
    });

    return questions.map(q => {
      const qAny = q as any;
      const options = [
          { text: qAny.answer1, image: qAny.answer1Image },
          { text: qAny.answer2, image: qAny.answer2Image },
          { text: qAny.answer3, image: qAny.answer3Image },
          { text: qAny.answer4, image: qAny.answer4Image },
          { text: qAny.answer5, image: qAny.answer5Image }
      ].filter(opt => opt.text || opt.image);

      const qImages: string[] = [];
      if (qAny.questionImage) {
        qImages.push(qAny.questionImage);
      }

      const mainQImage = qImages.length > 0 ? qImages[0] : null;

      return {
        id: q.id,
        questionNumber: q.questionNumber,
        text: qAny.questionText || '',
        options: options,
        hasImage: qImages.length > 0 || options.some(opt => opt.image),
        questionImage: mainQImage,
        questionImages: qImages,
        isTuition: false,
        correctAnswer: qAny.correctAnswer !== null ? qAny.correctAnswer - 1 : undefined,
        correctAnswer2: qAny.correctAnswer2 !== null ? qAny.correctAnswer2 - 1 : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

export async function checkSubmissionStatus(fullId: string) {
  try {
    let user = await getDbUser();
    if (!user) return { submitted: false };

    const existingMark = await prisma.pPmarks.findFirst({
      where: {
        paperId: fullId,
        userId: user.id
      }
    });

    if (existingMark) {
      const correctAnswers = await calculateCorrectAnswers(fullId);

      return {
        submitted: true,
        score: existingMark.score,
        total: existingMark.total,
        correctAnswers: correctAnswers
      };
    }

    return { submitted: false };
  } catch (error) {
    console.error("Error checking submission:", error);
    return { submitted: false };
  }
}

export async function submitTutionExam(
  paperId: string,
  answers: Record<number, number>,
  timeSpent: Record<number, number>,
  markedQuestions: number[],
  classCardNumber: string
) {
  try {
    const decodedId = decodeURIComponent(paperId);
    const tuitionPaper = await prisma.tutionPaper.findUnique({
      where: { id: decodedId },
      include: {
        categoryRel: true
      }
    });

    if (!tuitionPaper) throw new Error("Tuition paper not found");

    const questions = await prisma.tutionPaperDetails.findMany({
      where: { paperId: decodedId },
      orderBy: { questionNumber: 'asc' }
    });

    let score = 0;
    const total = questions.length;
    const markedSet = new Set(markedQuestions);
    const correctAnswers: Record<number, number> = {};
    const resultsData: any[] = [];

    questions.forEach((q, index) => {
      const correctIndex = q.correctAnswer1 !== null ? q.correctAnswer1 - 1 : -1; 
      const userAnswer = answers[index];
      const isCorrect = userAnswer === correctIndex;
      const isFlagged = markedSet.has(index);

      if (correctIndex !== -1) correctAnswers[index] = correctIndex;
      if (isCorrect) score++;

      resultsData.push({
        paperDetailId: q.id,
        userId: "", 
        selectedOption: userAnswer !== undefined ? userAnswer : null,
        timeSpent: timeSpent[index] || 0,
        isCorrect: isCorrect,
        isFlagged: isFlagged,
      });
    });

    let user = await getDbUser();
    if (!user) throw new Error("User not found. Please sign in.");

    const examStat = await prisma.pPmarknflag.create({
      data: {
        userId: user.id,
        paperId: decodedId,
        paperName: `[CARD:${classCardNumber}] ${tuitionPaper.title}`,
        subject: tuitionPaper.category || "Tuition",
        score: score,
        totalQuestions: total,
        flaggedCorrectCount: 0,
        flaggedWrongCount: 0,
        questionStats: {
          create: resultsData.map((r, idx) => ({
            questionIndex: idx,
            timeSpent: r.timeSpent,
            isFlagged: r.isFlagged,
            isCorrect: r.isCorrect,
            selectedOption: r.selectedOption
          }))
        }
      }
    });

    await prisma.pPmarks.create({
      data: {
        userId: user.id,
        subject: tuitionPaper.category || "Tuition",
        score: score,
        total: total,
        paperId: decodedId,
        paperName: tuitionPaper.title,
        type: "TUITION"
      }
    });

    return {
      success: true,
      score,
      total,
      correctAnswers,
      attemptId: examStat.id
    };
  } catch (error: any) {
    console.error('Error submitting tuition exam:', error);
    return { 
      success: false, 
      error: error.message || "Failed to submit exam" 
    };
  }
}

export async function submitExam(
  fullId: string, 
  answers: Record<number, number>,
  timeSpent: Record<number, number>, 
  markedQuestions: number[]
) {
  try {
    const decodedId = decodeURIComponent(fullId);
    const parts = decodedId.split('|');
    let whereClause: any = { paperId: decodedId };

    if (parts.length === 3) {
      const [subjectName, paperYear, paperId] = parts;
      whereClause = {
        subjectName: { equals: subjectName, mode: 'insensitive' },
        paperYear: parseInt(paperYear),
        paperId: paperId
      };
    }

    const questions = await prisma.pastPaper.findMany({
      where: whereClause,
      orderBy: { questionNumber: 'asc' }
    });

    if (questions.length === 0) throw new Error('Paper not found');

    let score = 0;
    const total = questions.length;
    let flaggedCorrectCount = 0;
    let flaggedWrongCount = 0;
    const markedSet = new Set(markedQuestions);
    const correctAnswers: Record<number, number> = {};
    const questionStatsData: any[] = [];

    questions.forEach((q, index) => {
      const correctIndex = q.correctAnswer !== null ? q.correctAnswer - 1 : -1;
      const userAnswer = answers[index];
      const isCorrect = userAnswer === correctIndex;
      const isFlagged = markedSet.has(index);

      if (correctIndex !== -1) {
        correctAnswers[index] = correctIndex;
      }

      if (isCorrect) {
        score++;
        if (isFlagged) flaggedCorrectCount++;
      } else {
        if (isFlagged) flaggedWrongCount++;
      }

      questionStatsData.push({
        questionIndex: index,
        timeSpent: timeSpent[index] || 0,
        isFlagged: isFlagged,
        isCorrect: isCorrect,
        selectedOption: userAnswer !== undefined ? userAnswer : null
      });
    });

    // 2. Identify User
    let user = await getDbUser(); 
    if (!user) throw new Error("User not found. Please sign in.");

    // --- 3. LOGIC: Check Previous Attempts ---
    const existingStat = await prisma.pPmarknflag.findFirst({
      where: { 
        userId: user.id, 
        paperId: fullId 
      }
    });

    let isNewHighScore = true;

    if (existingStat) {
      if (score > existingStat.score) {
        // CASE A: New score is HIGHER. Delete old record to make room for new one.
        await prisma.pPmarknflag.delete({
          where: { id: existingStat.id }
        });
        
        // Also remove from Marks table if you use it
           await prisma.pPmarks.deleteMany({
             where: { userId: user.id, paperId: fullId }
           });

      } else {
        // CASE B: New score is LOWER or EQUAL. Do NOT save to DB.
        isNewHighScore = false;
        // We still return the results so the user can see them, 
        // but we exit before the prisma.create calls below.
        return {
          success: true,
          score,
          total,
          correctAnswers,
          isNewHighScore: false, // Tell frontend this wasn't saved
          message: "Previous score was higher. Result not saved."
        };
      }
    }

    // 4. Save to Database (Only if it's a new attempt OR a high score)
    const examStat = await prisma.pPmarknflag.create({
      data: {
        userId: user.id,
        paperId: fullId,
        paperName: questions[0] ? `${questions[0].subjectName} ${questions[0].paperYear}` : 'Unknown',
        subject: questions[0]?.subjectName || 'Unknown',
        score: score,
        totalQuestions: total,
        flaggedIndices: markedQuestions,
        flaggedCorrectCount,
        flaggedWrongCount,
        questionStats: {
          create: questionStatsData
        }
      }
    });

    // Optional: Sync with Mark table
    await prisma.pPmarks.create({
        data: {
          subject: questions[0]?.subjectName || 'Unknown',
          score: score,
          total: total,
          userId: user.id,
          paperId: fullId,
          paperName: questions[0] ? `${questions[0].subjectName} ${questions[0].paperYear}` : 'Unknown',
          type: 'PAST_PAPER'
        }
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      score,
      total,
      correctAnswers,
      examStatId: examStat.id,
      isNewHighScore: true
    };

  } catch (error: any) {
    console.error('Error submitting exam:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit exam'
    };
  }
}
// --- Helper Functions ---

async function calculateCorrectAnswers(fullId: string) {
  // Check if it's a tuition paper
  const tuitionPaper = await prisma.tutionPaper.findUnique({
    where: { id: fullId }
  });

  if (tuitionPaper) {
    const questions = await prisma.tutionPaperDetails.findMany({
      where: { paperId: fullId },
      orderBy: { questionNumber: 'asc' }
    });

    const correctAnswers: Record<number, number> = {};
    questions.forEach((q, index) => {
      if (q.correctAnswer1 !== null) {
        correctAnswers[index] = q.correctAnswer1 - 1;
      }
    });
    return correctAnswers;
  }

  // Handle Past Paper with compound ID
  const parts = fullId.split('|');
  let whereClause: any = { paperId: fullId };

  if (parts.length === 3) {
    const [subjectName, paperYear, paperId] = parts;
    whereClause = {
      subjectName: subjectName,
      paperYear: parseInt(paperYear),
      paperId: paperId
    };
  }

  const questions = await prisma.pastPaper.findMany({
    where: whereClause,
    orderBy: { questionNumber: 'asc' }
  });

  const correctAnswers: Record<number, number> = {};

  questions.forEach((q, index) => {
    const correctIndex = q.correctAnswer !== null ? q.correctAnswer - 1 : -1;
    if (correctIndex !== -1) {
      correctAnswers[index] = correctIndex;
    }
  });

  return correctAnswers;
}

function findCorrectIndex(dbAnswer: string | null, options: string[]): number {
  if (!dbAnswer) return -1;
  const trimmedAnswer = dbAnswer.trim();
  const textIndex = options.findIndex(opt => opt.trim() === trimmedAnswer);
  if (textIndex !== -1) return textIndex;
  const numericVal = parseInt(trimmedAnswer);
  if (!isNaN(numericVal) && numericVal >= 1 && numericVal <= 5) return numericVal - 1;
  return -1;
}

// --- 1.5 Get User's Past Paper Marks and Map To UI Model ---
export async function getUserPastPapers(userId: string) {
  try {
    if (!userId) return [];

    // Get all marks for this user that are past paper attempts
    const marks = await prisma.pPmarks.findMany({
      where: { userId: userId, type: 'PAST_PAPER' },
    });

    // Map each mark to the ModelPaper UI shape
    const papers = await Promise.all(
      marks.map(async (m) => {
        const paper = await prisma.pastPaper.findFirst({
          where: { paperId: m.paperId || undefined },
        });

        const subject = paper?.subjectName || m.subject || 'Unknown';
        const year = paper?.paperYear || (m.date ? new Date(m.date).getFullYear() : new Date().getFullYear());
        const date = `${year}-01-01`;

        const parts: any[] = [
          {
            id: `${m.paperId || 'paper'}-part-1`,
            name: 'Part 1',
            marks: m.score || 0,
            totalMarks: m.total || 0,
          },
        ];

        if (m.part2Score != null || m.part2Total != null) {
          parts.push({
            id: `${m.paperId || 'paper'}-part-2`,
            name: 'Part 2',
            marks: m.part2Score || 0,
            totalMarks: m.part2Total || 0,
          });
        }

        return {
          id: m.paperId || m.id,
          type: 'past' as const,
          year: year,
          subject,
          date,
          parts,
          totalMarks: (m.total || 0) + (m.part2Total || 0),
          obtainedMarks: (m.score || 0) + (m.part2Score || 0),
        };
      })
    );

    return papers;
  } catch (error) {
    console.error('Error fetching user past papers:', error);
    return [];
  }
}

// --- 1.6 Get distinct papers filtered by provided subjects and year range ---
export async function getPapersForSubjects(subjects: string[] = []) {
  try {
    const whereClause: any = {};

    if (subjects && subjects.length > 0) {
      whereClause.subjectName = { in: subjects };
    }

    // Limit years between 2000 and 2025
    whereClause.paperYear = { gte: 2000, lte: 2025 };

    const papers = await prisma.pastPaper.findMany({
      where: whereClause,
      distinct: ["paperId"],
      select: {
        paperId: true,
        subjectName: true,
        paperYear: true,
      },
      orderBy: { paperYear: 'desc' }
    });

    return papers.map(p => ({
      id: p.paperId,
      subject: p.subjectName,
      year: p.paperYear,
      title: `${p.subjectName} ${p.paperYear}`
    }));
  } catch (error) {
    console.error('Error fetching papers for subjects:', error);
    return [];
  }
}

// --- 1.7 Upsert a user's past paper mark (simple create/update by user+paperId) ---
export async function upsertPastPaperMark(
  userId: string,
  paperId: string,
  score: number,
  total: number,
  subject?: string,
  paperName?: string,
  part2Score?: number,
  part2Total?: number
) {
  try {
    if (!userId || !paperId) return { error: 'userId and paperId are required' };

    const existing = await prisma.pPmarks.findFirst({ where: { userId, paperId } });

    if (existing) {
      await prisma.pPmarks.update({
        where: { id: existing.id },
        data: {
          score,
          total,
          part2Score: part2Score ?? existing.part2Score,
          part2Total: part2Total ?? existing.part2Total,
          subject: subject || existing.subject,
          paperName: paperName || existing.paperName,
          type: 'PAST_PAPER'
        }
      });
    } else {
      await prisma.pPmarks.create({
        data: {
          userId,
          paperId,
          score,
          total,
          part2Score: part2Score ?? undefined,
          part2Total: part2Total ?? undefined,
          subject: (subject || 'Unknown') as string,
          paperName: (paperName || '') as string,
          type: 'PAST_PAPER'
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error upserting past paper mark:', error);
    return { error: 'Failed to save mark' };
  }
}

// --- Yearly Topic Coverage (2000-2025) ---
// Returns for each subject: list of years (2000-2025) and which ones the user has completed
export async function getYearlyCoverageData() {
  try {
    const user = await getDbUser();

    // Get all distinct subject+year combos that exist in the DB (2000–2025)
    const allPapers = await prisma.pastPaper.findMany({
      where: { paperYear: { gte: 2000, lte: 2025 } },
      distinct: ['subjectName', 'paperYear'],
      select: { subjectName: true, paperYear: true, paperId: true },
      orderBy: { paperYear: 'asc' }
    });

    // Group by subject
    const subjectMap: Record<string, { year: number; paperId: string }[]> = {};
    allPapers.forEach(p => {
      if (!subjectMap[p.subjectName]) subjectMap[p.subjectName] = [];
      subjectMap[p.subjectName].push({ year: p.paperYear, paperId: p.paperId });
    });

    // Get user's completed papers
    const completedPaperIds = new Set<string>();
    if (user) {
      const marks = await prisma.pPmarks.findMany({
        where: { userId: user.id, type: 'PAST_PAPER' },
        select: { paperId: true }
      });
      marks.forEach(m => { if (m.paperId) completedPaperIds.add(m.paperId); });
    }

    // Build coverage result
    const result: Record<string, { year: number; paperId: string; done: boolean }[]> = {};
    for (const [subject, papers] of Object.entries(subjectMap)) {
      result[subject] = papers.map(p => ({
        year: p.year,
        paperId: p.paperId,
        done: completedPaperIds.has(p.paperId)
      }));
    }

    return { data: result, authenticated: !!user };
  } catch (error) {
    console.error('Error fetching yearly coverage data:', error);
    return { data: {}, authenticated: false };
  }
}

export async function getTuitionExams(userId: string) {
  try {
    if (!userId) return [];
    const marks = await prisma.pPmarks.findMany({
      where: { userId, type: 'TUITION' },
      orderBy: { date: 'asc' },
    });
    return marks.map(m => ({
      id: m.id,
      date: m.date.toISOString().split('T')[0],
      subject: m.subject,
      marks: m.score,
      totalMarks: m.total,
    }));
  } catch (error) {
    console.error('Failed to get tuition exams:', error);
    return [];
  }
}

export async function upsertTuitionExam(userId: string, data: { id?: string; date: string; subject: string; marks: number; totalMarks: number }) {
  try {
    if (!userId) return { error: 'User ID is required' };
    const dateObj = new Date(data.date);
    if (data.id) {
      await prisma.pPmarks.update({
        where: { id: data.id, userId },
        data: {
          date: dateObj,
          subject: data.subject,
          score: data.marks,
          total: data.totalMarks,
        }
      });
    } else {
      await prisma.pPmarks.create({
        data: {
          userId,
          date: dateObj,
          subject: data.subject,
          score: data.marks,
          total: data.totalMarks,
          type: 'TUITION'
        }
      });
    }
    revalidatePath('/analyse');
    return { success: true };
  } catch (error) {
    console.error('Failed to upsert tuition exam:', error);
    return { error: 'Failed to save tuition exam' };
  }
}

export async function deleteTuitionExam(id: string, userId: string) {
  try {
    if (!userId) return { error: 'User ID is required' };
    await prisma.pPmarks.delete({
      where: { id, userId }
    });
    revalidatePath('/analyse');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete tuition exam:', error);
    return { error: 'Failed to delete tuition exam' };
  }
}