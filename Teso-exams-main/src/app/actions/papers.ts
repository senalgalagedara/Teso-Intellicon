'use server';

import { prisma } from '@/lib/prisma';
import { PaperStatus } from '@prisma/client-new';
import { r2 } from '@/lib/r2';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { 
  getRedisSession, 
  createRedisSession, 
  updateRedisSessionStatus, 
  getRedisParticipants, 
  updateRedisParticipantStatus 
} from '@/lib/redisService';
import { hostPaperSchema } from '@/lib/auth/validation';


async function ensureHostUserExists(userId: string) {
  if (!userId) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await prisma.user.create({
        data: {
          id: userId,
          name: 'Host User',
          role: 'HOST'
        }
      });
    }
  } catch (err) {
    console.error("User existence check error:", err);
  }
}

export async function getPaperRequests() {
  try {
    const papers = await prisma.examPaper.findMany({
      orderBy: {
        createdAt: 'desc',
      }
    });

    // Fetch host names manually since there is no relation in the schema
    const hostIds = papers.map((p: any) => p.hostId).filter((id: any) => id !== null) as string[];
    const hosts = await prisma.user.findMany({
      where: {
        id: {
          in: hostIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const hostMap = new Map(hosts.map((t: any) => [t.id, t.name]));

    const serializedPapers = papers.map((paper: any) => ({
      ...paper,
      hostName: paper.hostId ? hostMap.get(paper.hostId) : 'Unknown',
      createdAt: paper.createdAt.toISOString(),
      updatedAt: paper.updatedAt.toISOString(),
      examDate: paper.examDate.toISOString(),
    }));

    return { success: true, data: serializedPapers };
  } catch (error: any) {
    console.error('Failed to fetch paper requests:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePaperStatus(id: string, status: PaperStatus) {
  try {
    const paper = await prisma.examPaper.update({
      where: { id },
      data: { status },
    });

    return { success: true, data: paper };
  } catch (error: any) {
    console.error('Failed to update paper status:', error);
    return { success: false, error: error.message };
  }
}



export async function saveExamQuestion(formData: FormData) {
  try {
    const paperId = formData.get('paperId') as string;
    const questionNumber = parseInt(formData.get('questionNumber') as string);
    const questionText = (formData.get('questionText') as string) || '';
    const topic = (formData.get('topic') as string) || '';
    const difficulty = (formData.get('difficulty') as string) || 'Medium';
    const correctAnswer1 = parseInt(formData.get('correctAnswer1') as string) || 1;
    const correctAnswer2Str = formData.get('correctAnswer2') as string;
    const correctAnswer2 = (correctAnswer2Str && correctAnswer2Str !== 'none') ? parseInt(correctAnswer2Str) : null;
    
    const deleteQuestionImage = formData.get('deleteQuestionImage') === 'true';
    const deleteAnswerImageUrls = [
      formData.get('deleteAnswerImage1') === 'true',
      formData.get('deleteAnswerImage2') === 'true',
      formData.get('deleteAnswerImage3') === 'true',
      formData.get('deleteAnswerImage4') === 'true',
      formData.get('deleteAnswerImage5') === 'true',
    ];

    if (!paperId || isNaN(questionNumber)) {
      throw new Error('Missing required fields: paperId or questionNumber');
    }

    const paper = await prisma.examPaper.findUnique({ where: { id: paperId } });
    if (!paper) throw new Error('Paper not found');

    const folderPath = `exam-papers/${paper.code}`;
    const r2Configured = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);

    // ── Question images (best-effort — never block DB save) ──
    let questionImageUrl = '';
    if (r2Configured) {
      const questionImages = formData.getAll('questionImages') as File[];
      for (const file of questionImages) {
        if (file && file.size > 0) {
          try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `${folderPath}/questions/q${questionNumber}_${uuidv4()}.png`;
            await r2.send(new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: fileName,
              Body: buffer,
              ContentType: file.type,
            }));
            // Use the internal proxy route so private R2 images are accessible in the browser
            questionImageUrl = `/api/r2-image?key=${encodeURIComponent(fileName)}`;
          } catch (imgErr) {
            console.warn('Question image upload failed (skipped):', imgErr);
          }
        }
      }
    }

    // ── Answer images (best-effort — never block DB save) ──
    const answerImageUrls: (string | null)[] = [null, null, null, null, null];
    if (r2Configured) {
      for (let i = 1; i <= 5; i++) {
        const file = formData.get(`answer${i}Image`) as File;
        if (file && file.size > 0) {
          try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `${folderPath}/answers/q${questionNumber}_a${i}_${uuidv4()}.png`;
            await r2.send(new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: fileName,
              Body: buffer,
              ContentType: file.type,
            }));
            // Use the internal proxy route so private R2 images are accessible in the browser
            answerImageUrls[i - 1] = `/api/r2-image?key=${encodeURIComponent(fileName)}`;
          } catch (imgErr) {
            console.warn(`Answer ${i} image upload failed (skipped):`, imgErr);
          }
        }
      }
    }

    // ── DB upsert — always runs ──
    const questionData = {
      paperId,
      questionNumber,
      questionText,
      topic,
      difficulty,
      questionImage: deleteQuestionImage ? null : (questionImageUrl || undefined),
      answer1: (formData.get('answer1') as string) || '',
      answer2: (formData.get('answer2') as string) || '',
      answer3: (formData.get('answer3') as string) || undefined,
      answer4: (formData.get('answer4') as string) || undefined,
      answer5: (formData.get('answer5') as string) || undefined,
      answer1Image: deleteAnswerImageUrls[0] ? null : (answerImageUrls[0] || undefined),
      answer2Image: deleteAnswerImageUrls[1] ? null : (answerImageUrls[1] || undefined),
      answer3Image: deleteAnswerImageUrls[2] ? null : (answerImageUrls[2] || undefined),
      answer4Image: deleteAnswerImageUrls[3] ? null : (answerImageUrls[3] || undefined),
      answer5Image: deleteAnswerImageUrls[4] ? null : (answerImageUrls[4] || undefined),
      correctAnswer1,
      correctAnswer2,
    };

    const result = await prisma.examPaperDetails.upsert({
      where: { paperId_questionNumber: { paperId, questionNumber } },
      update: questionData,
      create: questionData,
    });

    revalidatePath(`/host/papers/${paperId}/questions`);
    revalidatePath('/host');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error saving exam question:', error);
    return { success: false, error: error.message };
  }
}

export async function getExamPaperById(paperId: string) {
  try {
    const paper = await prisma.examPaper.findUnique({
      where: { id: paperId }
    });
    return { success: true, data: paper };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getExamPaperQuestions(paperId: string) {
  try {
    const questions = await prisma.examPaperDetails.findMany({
      where: { paperId },
      orderBy: { questionNumber: 'asc' },
    });
    return { success: true, data: questions };
  } catch (error: any) {
    console.error('Error fetching exam questions:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteExamQuestion(id: string) {
  try {
    const deleted = await prisma.examPaperDetails.delete({
      where: { id },
    });
    revalidatePath(`/host/papers/${deleted.paperId}/questions`);
    revalidatePath('/host');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting exam question:', error);
    return { success: false, error: error.message };
  }
}

export async function getExamPaperIds() {
  try {
    const papers = await prisma.examPaper.findMany({
      select: {
        id: true,
        code: true,
        title: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: papers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveExamPaper(data: {
  id?: string,
  title: string,
  code: string,
  hostId?: string,
  examDate?: string
}) {
  try {
    if (data.hostId) await ensureHostUserExists(data.hostId);
    
    const paper = await prisma.examPaper.upsert({
      where: { code: data.code },
      update: {
        title: data.title,
        hostId: data.hostId!,
        examDate: data.examDate ? new Date(data.examDate) : new Date(),
      },
      create: {
        title: data.title,
        code: data.code,
        hostId: data.hostId!,
        examDate: data.examDate ? new Date(data.examDate) : new Date(),
        questionUrl: '',
        answerUrl: '',
      },
    });
    return { success: true, data: paper };
  } catch (error: any) {
    console.error('Error saving exam paper:', error);
    return { success: false, error: error.message };
  }
}

export async function createHostPaper(data: {
  hostId: string;
  paperTitle: string;
  numberOfStudents: number;
  questionCount: number;
  answersPerQuestion: number;
  examDate: string;
  examDurationMins?: number;
}) {
  try {
    const validated = hostPaperSchema.safeParse({
      paperTitle: data.paperTitle,
      numberOfStudents: data.numberOfStudents,
      questionCount: data.questionCount,
      answersPerQuestion: data.answersPerQuestion,
      examDate: data.examDate,
      examDurationMins: data.examDurationMins ?? 60,
    });

    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Invalid paper details provided.' };
    }

    if (data.hostId) await ensureHostUserExists(data.hostId);
    
    const paperCode = `PAPER-${uuidv4().substring(0, 8).toUpperCase()}`;

    const paper = await prisma.examPaper.create({
      data: {
        code: paperCode,
        title: validated.data.paperTitle,
        hostId: data.hostId,
        examDate: new Date(validated.data.examDate),
        status: 'PENDING',
        questionCount: validated.data.questionCount,
        numberOfStudents: validated.data.numberOfStudents,
        answersPerQuestion: validated.data.answersPerQuestion,
        examDurationMins: validated.data.examDurationMins,
        questionUrl: '',
        answerUrl: '',
      },
    });

    revalidatePath('/host');
    return { success: true, data: paper };
  } catch (error: any) {
    console.error('Failed to create host paper:', error);
    return { success: false, error: error.message };
  }
}

export async function updateHostPaper(data: {
  paperId: string;
  paperTitle: string;
  numberOfStudents: number;
  questionCount: number;
  answersPerQuestion: number;
  examDate: string;
  examDurationMins?: number;
}) {
  try {
    if (!data.paperId) {
      return { success: false, error: 'Paper ID is required.' };
    }

    const validated = hostPaperSchema.safeParse({
      paperTitle: data.paperTitle,
      numberOfStudents: data.numberOfStudents,
      questionCount: data.questionCount,
      answersPerQuestion: data.answersPerQuestion,
      examDate: data.examDate,
      examDurationMins: data.examDurationMins ?? 60,
    });

    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Invalid paper details provided.' };
    }

    const paper = await prisma.examPaper.update({
      where: { id: data.paperId },
      data: {
        title: validated.data.paperTitle,
        examDate: new Date(validated.data.examDate),
        questionCount: validated.data.questionCount,
        numberOfStudents: validated.data.numberOfStudents,
        answersPerQuestion: validated.data.answersPerQuestion,
        examDurationMins: validated.data.examDurationMins,
      },
    });

    revalidatePath('/host');
    return { success: true, data: paper };
  } catch (error: any) {
    console.error('Failed to update host paper:', error);
    return { success: false, error: error.message };
  }
}

export async function getHostPapers(hostId: string) {
  try {
    const papers = await prisma.examPaper.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = papers.map((p: any) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      status: p.status,
      questionCount: p.questionCount,
      numberOfStudents: p.numberOfStudents,
      examDate: p.examDate ? p.examDate.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      answersPerQuestion: p.answersPerQuestion,
      examDurationMins: p.examDurationMins,
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('Failed to fetch host papers:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteExamPaper(id: string) {
  try {
    await prisma.examPaper.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete exam paper:', error);
    return { success: false, error: error.message };
  }
}
export async function getHostSession(examCode: string) {
  try {
    let session = await getRedisSession(examCode);
    if (session && session.status === 'ACTIVE' && session.startedAt) {
      const startTime = new Date(session.startedAt).getTime();
      const durationMs = session.durationMins * 60 * 1000;
      if (startTime + durationMs < Date.now()) {
        // Session has expired! End it.
        await updateRedisSessionStatus(examCode, 'ENDED', undefined, new Date());
        
        // Stop server timer
        if ((global as any).stopExamTimer) {
          (global as any).stopExamTimer(examCode);
        }
        
        session = null;
      }
    }

    if (!session) {
      // Create a new session if none exists
      const paper = await prisma.examPaper.findUnique({ where: { code: examCode } });
      if (!paper) throw new Error("Paper not found");

      const newSession = {
        id: uuidv4(),
        paperId: paper.id,
        title: paper.title,
        status: 'WAITING' as const,
        startedAt: null,
        endedAt: null,
        durationMins: paper.examDurationMins || 60
      };
      await createRedisSession(examCode, newSession);

      // Broadcast status
      (global as any).io?.to(`exam:${examCode}`).emit('session-status-updated', newSession);

      return { success: true, data: newSession };
    }

    const data = {
      ...session,
      paper: {
        id: session.paperId,
        title: session.title,
        examDurationMins: session.durationMins
      }
    };

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(sessionId: string, status: 'ACTIVE' | 'ENDED', examCode: string) {
  try {
    const startedAt = status === 'ACTIVE' ? new Date() : undefined;
    const endedAt = status === 'ENDED' ? new Date() : undefined;

    await updateRedisSessionStatus(examCode, status, startedAt, endedAt);
    const session = await getRedisSession(examCode);

    if (status === 'ACTIVE' && session) {
      // Start server-side countdown timer thread
      if ((global as any).startExamTimer) {
        (global as any).startExamTimer(examCode, session.durationMins);
      }
      
      // Broadcast to students
      (global as any).io?.to(`exam:${examCode}`).emit('exam-started', {
        startedAt: session.startedAt,
        durationMins: session.durationMins
      });
    }

    if (status === 'ENDED') {
      // Stop server timer
      if ((global as any).stopExamTimer) {
        (global as any).stopExamTimer(examCode);
      }
      
      // Broadcast to students
      (global as any).io?.to(`exam:${examCode}`).emit('exam-ended');

      // Persist the final exam session and final participant records to PostgreSQL for historical dashboards
      if (session) {
        const participants = await getRedisParticipants(examCode);
        
        const dbSession = await prisma.examSession.upsert({
          where: { id: session.id },
          update: {
            status: 'ENDED',
            endedAt: new Date()
          },
          create: {
            id: session.id,
            paperId: session.paperId,
            status: 'ENDED',
            startedAt: session.startedAt ? new Date(session.startedAt) : new Date(),
            endedAt: new Date(),
            durationMins: session.durationMins
          }
        });

        if (participants.length > 0) {
          const activeParticipants = participants.filter(p => p.status !== 'DECLINED');
          await prisma.examParticipant.createMany({
            data: activeParticipants.map(p => ({
              id: p.id,
              sessionId: dbSession.id,
              userId: p.userId,
              fullName: p.fullName,
              classCode: p.classCode,
              status: p.status as any,
              answeredCount: p.answeredCount,
              totalQuestions: p.totalQuestions,
              score: p.score,
              admittedAt: p.admittedAt ? new Date(p.admittedAt) : null,
              startedAt: p.startedAt ? new Date(p.startedAt) : null,
              submittedAt: p.submittedAt ? new Date(p.submittedAt) : null,
              lastSeenAt: new Date(p.lastSeenAt)
            })),
            skipDuplicates: true
          });
        }
      }
    }

    const formattedSession = session ? {
      ...session,
      paper: {
        id: session.paperId,
        title: session.title,
        examDurationMins: session.durationMins
      }
    } : null;

    return { success: true, data: formattedSession };
  } catch (error: any) {
    console.error("Failed to update session status:", error);
    return { success: false, error: error.message };
  }
}

export async function getParticipants(examCode: string) {
  try {
    const participants = await getRedisParticipants(examCode);
    const sorted = [...participants].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    return { success: true, data: sorted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateParticipantStatus(participantId: string, status: 'ADMITTED' | 'DECLINED' | 'KICKED', examCode: string) {
  try {
    const updated = await updateRedisParticipantStatus(examCode, participantId, status);
    if (updated) {
      // Notify host lobby room
      (global as any).io?.to(`exam:${examCode}:host`).emit('participant-status-changed', { participantId, status });
      
      // Notify individual student room
      (global as any).io?.to(`participant:${participantId}`).emit('status-update', {
        participantId,
        status,
        sessionStatus: 'WAITING'
      });
    }
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHostCandidates(hostId: string) {
  try {
    // Fetch all papers hosted by this host
    const papers = await prisma.examPaper.findMany({
      where: { hostId },
      select: { id: true, title: true, code: true }
    });

    const paperIds = papers.map((p) => p.id);
    if (paperIds.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch all participants in sessions of these papers
    const participants = await prisma.examParticipant.findMany({
      where: {
        session: {
          paperId: { in: paperIds }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            grade: true,
            examType: true,
            stream: true,
            subjects: true,
            createdAt: true
          }
        },
        session: {
          include: {
            paper: {
              select: {
                id: true,
                title: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Group participants by user (candidate)
    const candidateMap = new Map<string, any>();

    for (const part of participants) {
      const userId = part.userId;
      if (!candidateMap.has(userId)) {
        const u = part.user;
        candidateMap.set(userId, {
          id: userId,
          name: u?.name || part.fullName || 'Unknown Student',
          email: u?.email || 'N/A',
          studentId: u?.studentId || part.classCode || 'N/A',
          grade: u?.grade || 'N/A',
          examType: u?.examType || 'N/A',
          stream: u?.stream || 'N/A',
          subjects: u?.subjects || [],
          registeredAt: u?.createdAt ? u.createdAt.toISOString() : part.createdAt.toISOString(),
          attempts: []
        });
      }

      const cand = candidateMap.get(userId);
      cand.attempts.push({
        participantId: part.id,
        sessionId: part.sessionId,
        paperId: part.session.paper.id,
        paperTitle: part.session.paper.title,
        paperCode: part.session.paper.code,
        status: part.status,
        score: part.score,
        answeredCount: part.answeredCount,
        totalQuestions: part.totalQuestions,
        startedAt: part.startedAt ? part.startedAt.toISOString() : null,
        submittedAt: part.submittedAt ? part.submittedAt.toISOString() : null,
        lastSeenAt: part.lastSeenAt ? part.lastSeenAt.toISOString() : null
      });
    }

    const data = Array.from(candidateMap.values());
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to fetch host candidates:", error);
    return { success: false, error: error.message };
  }
}

