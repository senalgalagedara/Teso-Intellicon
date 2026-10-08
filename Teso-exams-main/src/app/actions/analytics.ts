'use server';

import { prisma } from '@/lib/prisma';

export interface OptionBreakdownItem {
  optionIndex: number;
  text: string;
  count: number;
  isCorrect: boolean;
}

export interface QuestionAnalytics {
  questionNumber: number;
  topic: string;
  correctAnswers: number;
  totalStudents: number;
  marks: number;
  difficulty: string;
  confident: number;
  normal: number;
  notSure: number;
  averageTimeSpent: number;
  optionBreakdown: OptionBreakdownItem[];
}

export interface StudentSubmission {
  name: string;
  score: number;
  percentage: number;
  timeTakenMins: number;
}

export interface PaperAnalyticsData {
  paperName: string;
  totalMarks: number;
  scores: number[];
  questions: QuestionAnalytics[];
  studentSubmissions: StudentSubmission[];
}

export async function getPaperAnalytics(paperId: string): Promise<PaperAnalyticsData | null> {
  if (!paperId) return null;
  try {
    const paper = await prisma.examPaper.findUnique({
      where: { id: paperId },
      include: {
        questions: {
          include: {
            studentResults: true
          }
        },
        sessions: {
          include: {
            participants: {
              where: {
                status: 'SUBMITTED',
                score: { not: null }
              }
            }
          }
        }
      }
    });

    if (!paper) return null;

    // Collect all valid scores from participants
    const scores: number[] = [];
    paper.sessions.forEach(session => {
      session.participants.forEach(participant => {
        if (participant.score !== null) {
          scores.push(participant.score);
        }
      });
    });

    // Calculate dynamic total marks:
    // (sum of (1 / number of correct answers) for each question) * total questions
    let calculatedTotalMarks = 0;
    paper.questions.forEach((q) => {
      const numAnswers = q.correctAnswer2 !== null ? 2 : 1;
      calculatedTotalMarks += 1 / numAnswers;
    });
    const finalTotalMarks = calculatedTotalMarks * paper.questions.length;

    // Process individual student submissions (Pace vs. Score)
    const studentSubmissions: StudentSubmission[] = [];
    paper.sessions.forEach(session => {
      session.participants.forEach(p => {
        if (p.score !== null) {
          const durationMs = p.submittedAt && p.startedAt 
            ? p.submittedAt.getTime() - p.startedAt.getTime() 
            : 0;
          const timeTakenMins = durationMs > 0 ? durationMs / (1000 * 60) : 0;
          const percentage = finalTotalMarks > 0 ? (p.score / finalTotalMarks) * 100 : 0;
          studentSubmissions.push({
            name: p.fullName,
            score: p.score,
            percentage,
            timeTakenMins
          });
        }
      });
    });

    // Process question analytics
    const questions: QuestionAnalytics[] = paper.questions.map(q => {
      let correctAnswers = 0;
      let confident = 0;
      let notSure = 0;
      
      q.studentResults.forEach(result => {
        if (result.isCorrect) correctAnswers++;
        if (result.isFlagged) {
          notSure++;
        } else {
          confident++;
        }
      });

      const questionMarks = (1 / (q.correctAnswer2 !== null ? 2 : 1)) * paper.questions.length;

      // Extract option texts
      const options = [
        { index: 1, text: q.answer1 || '' },
        { index: 2, text: q.answer2 || '' },
        { index: 3, text: q.answer3 || '' },
        { index: 4, text: q.answer4 || '' },
        { index: 5, text: q.answer5 || '' }
      ].filter(opt => opt.text || opt.index <= 2);

      // Count selections for each option
      const optionBreakdown = options.map(opt => {
        const count = q.studentResults.filter(r => r.selectedOption === opt.index).length;
        const isCorrect = opt.index === q.correctAnswer1 || opt.index === q.correctAnswer2;
        return {
          optionIndex: opt.index,
          text: opt.text,
          count,
          isCorrect
        };
      });

      // Calculate average time spent
      const totalTime = q.studentResults.reduce((sum, r) => sum + r.timeSpent, 0);
      const averageTimeSpent = q.studentResults.length > 0 ? totalTime / q.studentResults.length : 0;

      return {
        questionNumber: q.questionNumber,
        topic: q.topic || `Topic ${q.questionNumber}`,
        correctAnswers,
        totalStudents: q.studentResults.length,
        marks: questionMarks,
        difficulty: q.difficulty || 'Medium',
        confident,
        normal: 0,
        notSure,
        averageTimeSpent,
        optionBreakdown
      };
    });

    return {
      paperName: paper.title,
      totalMarks: finalTotalMarks,
      scores,
      questions,
      studentSubmissions
    };
  } catch (error) {
    console.error('Error fetching paper analytics:', error);
    return null;
  }
}

export async function getLeaderboard(paperId: string) {
  if (!paperId) return [];
  try {
    const sessions = await prisma.examSession.findMany({
      where: { paperId },
      select: { id: true }
    });

    const sessionIds = sessions.map(s => s.id);

    if (sessionIds.length === 0) return [];

    const participants = await prisma.examParticipant.findMany({
      where: {
        sessionId: { in: sessionIds },
        status: 'SUBMITTED',
        score: { not: null }
      },
      orderBy: {
        score: 'desc'
      },
      select: {
        id: true,
        fullName: true,
        score: true,
        userId: true
      }
    });

    return participants.map((p, index) => ({
      id: p.id,
      name: p.fullName,
      score: p.score as number,
      rank: index + 1,
      trend: 'stable', // Can be computed historically if data exists, default 'stable'
      status: index < 5 ? 'Elite' : index < 15 ? 'Advanced' : 'Active' // Simple mock status based on rank
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}
