import { prismaNew as prisma } from '@/lib/prisma';
import ManageQuestionsClient from './ManageQuestionsClient';
import { notFound } from 'next/navigation';

// Always fetch fresh data — never serve from cache
export const dynamic = 'force-dynamic';

export default async function ManageQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const paperId = resolvedParams.id;
  const paper = await prisma.examPaper.findUnique({
    where: { id: paperId },
  });

  if (!paper) {
    notFound();
  }

  const questions = await prisma.examPaperDetails.findMany({
    where: { paperId },
    orderBy: { questionNumber: 'asc' },
  });

  // Serialize Date fields — raw Date objects cannot cross the server→client boundary
  const serializedPaper = {
    ...paper,
    examDate: paper.examDate?.toISOString() ?? null,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
  };

  const serializedQuestions = questions.map((q) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <ManageQuestionsClient
        paper={serializedPaper}
        existingQuestions={serializedQuestions}
      />
    </div>
  );
}
