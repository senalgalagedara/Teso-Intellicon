import { NextRequest, NextResponse } from 'next/server';
import { prismaNew as prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Paper id required' }, { status: 400 });

    const paper = await prisma.examPaper.findUnique({ where: { id } });
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 });

    const details = await prisma.examPaperDetails.findMany({
      where: { paperId: String(id) },
      include: { studentResults: true },
      orderBy: { questionNumber: 'asc' },
    });

    const questionCount = details.length || 0;
    const totalMarks = Number(paper.totalMarks || 0) || (questionCount > 0 ? questionCount * 1 : 0);
    const perQuestionMark = questionCount > 0 ? totalMarks / questionCount : 1;

    const questions = details.map((d) => ({
      questionNumber: d.questionNumber,
      topic: d.topic,
      difficulty: d.difficulty,
      totalStudents: d.studentResults.length,
      correctAnswers: d.studentResults.filter((r) => r.isCorrect).length,
      marks: perQuestionMark,
    }));

    // Aggregate scores per student
    const scoresMap: Record<string, number> = {};
    details.forEach((d) => {
      d.studentResults.forEach((r) => {
        const uid = r.userId || 'unknown';
        if (!scoresMap[uid]) scoresMap[uid] = 0;
        if (r.isCorrect) scoresMap[uid] += perQuestionMark;
      });
    });

    const scores = Object.values(scoresMap).map((s) => Number(s));

    const response = {
      id: paper.id,
      name: paper.title,
      date: paper.examDate ? paper.examDate.toISOString() : null,
      code: paper.code,
      categoryName: null,
      totalMarks,
      questions,
      scores,
    };

    return NextResponse.json({ paper: response });
  } catch (error) {
    console.error('GET /api/host/analytics/[id] error', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
