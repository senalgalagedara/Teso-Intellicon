'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Mock user for now since auth is disabled in the snippet provided previously
async function getDbUser() {
    return null;
}

export async function getAvailablePapers() {
  try {
    const papers = await prisma.examPaper.findMany({
      where: { status: 'UPLOADED' },
      select: {
        id: true,
        title: true,
        code: true,
      }
    });

    return papers.map(p => ({
      id: p.id,
      title: p.title,
      subject: 'Exam',
      year: new Date().getFullYear(),
      type: 'specific-paper' as const,
      downloadUrl: '#',
      requiresCode: true,
      accessCode: p.code
    }));
  } catch (error) {
    console.error('Error fetching papers:', error);
    return [];
  }
}

/**
 * Converts any stored image reference into the /api/r2-image proxy URL.
 * Handles three cases:
 *  1. Already a proxy URL  → returned as-is
 *  2. Full private R2 URL  → key is extracted and proxied
 *  3. Raw object key       → proxied directly
 */
function toProxyUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Already a proxy URL — leave it alone
  if (raw.startsWith('/api/r2-image')) return raw;

  // Full URL from the private R2 S3 endpoint (old format stored in DB)
  // e.g. https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key>
  //   or https://<accountId>.r2.cloudflarestorage.com/<key>
  try {
    const url = new URL(raw);
    if (url.hostname.endsWith('.r2.cloudflarestorage.com')) {
      // Strip the leading slash; everything after the first path segment is the key
      const pathParts = url.pathname.replace(/^\//, '').split('/');
      // If the bucket name is the first segment, skip it
      const bucketName = process.env.R2_BUCKET_NAME || 'exam-assets';
      const key = pathParts[0] === bucketName
        ? pathParts.slice(1).join('/')
        : pathParts.join('/');
      return `/api/r2-image?key=${encodeURIComponent(key)}`;
    }
  } catch {
    // Not a valid URL — treat as a raw object key
  }

  // Bare object key (e.g. "exam-papers/PAPER-ABC/questions/q1_uuid.png")
  return `/api/r2-image?key=${encodeURIComponent(raw)}`;
}

export async function getPaperQuestions(paperId: string) {
  if (!paperId) return [];
  try {
    const decodedId = decodeURIComponent(paperId);
    const paper = await prisma.examPaper.findUnique({
      where: { id: decodedId }
    });

    if (!paper) return [];

    const questions = await prisma.examPaperDetails.findMany({
      where: { paperId: decodedId },
      orderBy: { questionNumber: 'asc' },
    });

    return questions.map(q => {
      const options = [
        { text: q.answer1, image: toProxyUrl(q.answer1Image) },
        { text: q.answer2, image: toProxyUrl(q.answer2Image) },
        { text: q.answer3, image: toProxyUrl(q.answer3Image) },
        { text: q.answer4, image: toProxyUrl(q.answer4Image) },
        { text: q.answer5, image: toProxyUrl(q.answer5Image) }
      ].filter(opt => opt.text || opt.image);

      const proxyQuestionImage = toProxyUrl(q.questionImage);

      return {
        id: q.id,
        questionNumber: q.questionNumber,
        text: q.questionText || q.topic || '', 
        options: options, 
        hasImage: !!proxyQuestionImage || options.some(opt => opt.image),
        questionImage: proxyQuestionImage,
        questionImages: proxyQuestionImage ? [proxyQuestionImage] : [],
        answerImages: [],
        correctAnswer: q.correctAnswer1 !== null ? q.correctAnswer1 - 1 : undefined,
        correctAnswer2: q.correctAnswer2 !== null ? q.correctAnswer2 - 1 : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

export async function checkSubmissionStatus(paperId: string) {
    // Auth disabled
    return { submitted: false };
}

// Removed legacy submission functions (submitTutionExam, submitExam) 
// that relied on old models like PPmarknflag and PPmarks.
// Real-time exam results are handled via ExamParticipant and ExamQuestionResult in the new schema.

