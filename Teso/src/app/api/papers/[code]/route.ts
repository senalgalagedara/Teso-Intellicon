import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

    const paper = await prisma.tutionPaper.findUnique({ where: { code } });
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 });

    // `viewCount` field does not exist on `TutionPaper` schema — skip increment.
    // If you want to track views, add a numeric field to the Prisma model
    // and update it here. For now, skip silently.

    return NextResponse.json({
      success: true,
      title: paper.title,
      category: paper.category,
      examDate: paper.examDate,
      questionUrl: paper.questionUrl,
    });
  } catch (error) {
    console.error('Error fetching paper by code:', error);
    return NextResponse.json({ error: 'Failed to fetch paper' }, { status: 500 });
  }
}