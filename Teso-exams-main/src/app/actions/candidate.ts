"use server";

import { prismaNew as prisma, prismaTeso } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';
import redis from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";
import { 
  getRedisSession, 
  createRedisSession, 
  updateRedisSessionStatus, 
  getRedisParticipant, 
  getRedisParticipantById,
  addOrUpdateRedisParticipant, 
  updateRedisParticipantStatus, 
  updateRedisParticipantProgress,
  saveRedisAnswer,
  getRedisAnswers,
  clearRedisAnswers,
  getRedisParticipants
} from "@/lib/redisService";

import { candidateIdentitySchema } from "@/lib/auth/validation";

export async function joinExam(fullName: string, classCode: string, examCode: string, loggedInUserId?: string) {
  try {
    const validated = candidateIdentitySchema.safeParse({ fullName, classCode, examCode });
    if (!validated.success) {
      const err = validated.error.issues[0]?.message || "Invalid candidate information provided.";
      return { success: false, error: err };
    }

    const validData = validated.data;
    const exam = await prisma.examPaper.findUnique({
      where: { code: validData.examCode }
    });

    if (!exam) return { success: false, error: "Exam not found" };

    // Get Session from Redis
    let session = await getRedisSession(examCode);

    if (session && session.status === 'ACTIVE' && session.startedAt) {
      const startTime = new Date(session.startedAt).getTime();
      const durationMs = session.durationMins * 60 * 1000;
      if (startTime + durationMs < Date.now()) {
        // Session has expired! End it.
        await updateRedisSessionStatus(examCode, 'ENDED', undefined, new Date());
        if ((global as any).stopExamTimer) {
          (global as any).stopExamTimer(examCode);
        }
        session = null;
      }
    }

    if (!session) {
      session = {
        id: uuidv4(),
        paperId: exam.id,
        title: exam.title,
        status: 'WAITING' as const,
        startedAt: null,
        endedAt: null,
        durationMins: exam.examDurationMins || 60
      };
      await createRedisSession(examCode, session);
      (global as any).io?.to(`exam:${examCode}`).emit('session-status-updated', session);
    }

    // Find or Create User
    let user = null;
    if (loggedInUserId) {
      user = await prisma.user.findUnique({
        where: { id: loggedInUserId }
      });
      if (user && !user.studentId) {
        const existingStudent = await prisma.user.findUnique({
          where: { studentId: classCode }
        });
        if (!existingStudent) {
          user = await prisma.user.update({
            where: { id: loggedInUserId },
            data: { studentId: classCode }
          });
        }
      }
    }

    if (!user) {
      // Create a guest user record with isGuest: true and a unique studentId
      user = await prisma.user.create({
        data: {
          name: fullName,
          studentId: `GUEST_${uuidv4()}`,
          role: "STUDENT",
          isGuest: true
        }
      });
    }

    // Check mapping to allow re-joins
    let participant = await getRedisParticipant(examCode, user.id);
    const initialStatus = participant ? participant.status : 'WAITING';

    if (!participant) {
      participant = {
        id: uuidv4(),
        sessionId: session.id,
        userId: user.id,
        fullName,
        classCode,
        status: initialStatus,
        answeredCount: 0,
        totalQuestions: exam.questionCount,
        score: null,
        admittedAt: null,
        startedAt: null,
        submittedAt: null,
        lastSeenAt: new Date().toISOString()
      };
      await addOrUpdateRedisParticipant(examCode, participant);
      
      // Notify host lobby
      (global as any).io?.to(`exam:${examCode}:host`).emit('participant-joined', participant);
    } else {
      participant.fullName = fullName;
      participant.lastSeenAt = new Date().toISOString();
      await addOrUpdateRedisParticipant(examCode, participant);
    }

    // Set map keys in Redis for direct client action routing
    await redis.set(`participant:exam:${participant.id}`, examCode, { EX: 86400 });
    await redis.set(`user:exam:${user.id}`, examCode, { EX: 86400 });

    return { 
      success: true, 
      data: { 
        participantId: participant.id, 
        userId: user.id, 
        paperId: exam.id,
        sessionId: session.id,
        status: participant.status,
        examTitle: exam.title
      } 
    };

  } catch (error: any) {
    console.error("Failed to join exam:", error);
    return { success: false, error: error.message };
  }
}

export async function getParticipantStatus(participantId: string) {
  try {
    const examCode = await redis.get(`participant:exam:${participantId}`);
    if (!examCode) return { success: false, error: "Participant session expired or not found" };

    const session = await getRedisSession(examCode);
    if (!session) return { success: false, error: "Session not found" };

    const participant = await getRedisParticipantById(examCode, participantId);
    if (!participant) return { success: false, error: "Participant not found" };

    return { 
      success: true, 
      data: {
        ...participant,
        session: {
          ...session,
          paper: {
            id: session.paperId,
            title: session.title,
            examDurationMins: session.durationMins
          }
        }
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateParticipantProgress(participantId: string, answeredCount: number) {
  try {
    const examCode = await redis.get(`participant:exam:${participantId}`);
    if (!examCode) return { success: false, error: "Participant session mapping not found" };

    const updated = await updateRedisParticipantProgress(examCode, participantId, answeredCount);
    if (updated) {
      (global as any).io?.to(`exam:${examCode}:host`).emit('progress-update', {
        participantId,
        answeredCount,
        status: updated.status
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitExamAnswer(paperDetailId: string, userId: string, selectedOption: number | null, numericAnswer: number | null, timeSpent: number, isCorrect: boolean) {
  // Legacy function fallback
  return { success: true };
}

export async function submitBulkExamAnswers(answers: {
  paperDetailId: string;
  userId: string;
  selectedOption: number | null;
  numericAnswer: number | null;
  timeSpent: number;
  isCorrect: boolean;
}[]) {
  // Legacy function fallback
  return { success: true, count: answers.length };
}

export async function getExamResults(paperId: string) {
  try {
    const results = await prisma.examQuestionResult.findMany({
      where: { paperDetail: { paperId } },
      include: {
         paperDetail: true
      }
    });

    const accessList = await prisma.examPaperAccess.findMany({
      where: { paperId },
      include: { user: true }
    });

    return { success: true, data: { results, students: accessList } };
  } catch (error: any) {
    console.error("Failed to get results:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCandidateStatus(participantId: string, status: 'IN_EXAM' | 'SUBMITTED', score?: number) {
  try {
    const examCode = await redis.get(`participant:exam:${participantId}`);
    if (!examCode) return { success: false, error: "Participant session mapping not found" };

    const session = await getRedisSession(examCode);
    if (!session) return { success: false, error: "Session not found" };

    const updated = await updateRedisParticipantStatus(examCode, participantId, status, score);
    if (updated) {
      (global as any).io?.to(`exam:${examCode}:host`).emit('progress-update', {
        participantId,
        answeredCount: updated.answeredCount,
        status
      });

      if (status === 'SUBMITTED') {
        // Notify host live monitor
        (global as any).io?.to(`exam:${examCode}:host`).emit('participant-submitted', {
          participantId,
          score: score ?? 0
        });

        // 1. Ensure ExamSession exists in PostgreSQL first so foreign key constraints succeed!
        await prisma.examSession.upsert({
          where: { id: session.id },
          update: {
            status: session.status || 'ACTIVE'
          },
          create: {
            id: session.id,
            paperId: session.paperId,
            status: session.status || 'ACTIVE',
            startedAt: session.startedAt ? new Date(session.startedAt) : new Date(),
            durationMins: session.durationMins || 60
          }
        });

        // 2. Persist answers and participant record to PostgreSQL
        const answers = await getRedisAnswers(examCode, updated.userId);

        await prisma.examParticipant.upsert({
          where: {
            sessionId_userId: {
              sessionId: session.id,
              userId: updated.userId
            }
          },
          update: {
            status: 'SUBMITTED',
            score: score ?? 0,
            answeredCount: updated.answeredCount,
            submittedAt: new Date(),
            lastSeenAt: new Date()
          },
          create: {
            id: updated.id,
            sessionId: session.id,
            userId: updated.userId,
            fullName: updated.fullName,
            classCode: updated.classCode,
            status: 'SUBMITTED',
            answeredCount: updated.answeredCount,
            totalQuestions: updated.totalQuestions,
            score: score ?? 0,
            startedAt: updated.startedAt ? new Date(updated.startedAt) : new Date(),
            submittedAt: new Date()
          }
        });

        const paperDetails = await prisma.examPaperDetails.findMany({
          where: { paperId: session.paperId }
        });
        const detailsMap = new Map(paperDetails.map(d => [d.id, d]));

        const resultsData: any[] = [];
        for (const [detailId, ans] of Object.entries(answers)) {
          const detailObj = detailsMap.get(detailId);
          const correctSet = new Set<number>();
          if (detailObj) {
            if (detailObj.correctAnswer1 !== null) correctSet.add(detailObj.correctAnswer1);
            if (detailObj.correctAnswer2 !== null) correctSet.add(detailObj.correctAnswer2);
          }

          if (ans.selectedOptions && ans.selectedOptions.length > 0) {
            ans.selectedOptions.forEach((opt: number) => {
              const isCorrect = correctSet.has(opt);
              resultsData.push({
                paperDetailId: detailId,
                userId: updated.userId,
                selectedOption: opt,
                numericAnswer: ans.numericAnswer,
                timeSpent: ans.timeSpent || 0,
                isCorrect
              });
            });
          } else {
            resultsData.push({
              paperDetailId: detailId,
              userId: updated.userId,
              selectedOption: null,
              numericAnswer: ans.numericAnswer,
              timeSpent: ans.timeSpent || 0,
              isCorrect: false
            });
          }
        }

        // Ensure questions that were skipped/untouched also have recorded entries
        for (const detail of paperDetails) {
          if (!answers[detail.id]) {
            resultsData.push({
              paperDetailId: detail.id,
              userId: updated.userId,
              selectedOption: null,
              numericAnswer: null,
              timeSpent: 0,
              isCorrect: false
            });
          }
        }

        if (resultsData.length > 0) {
          await prisma.examQuestionResult.deleteMany({
            where: {
              userId: updated.userId,
              paperDetail: { paperId: session.paperId }
            }
          });
          await prisma.examQuestionResult.createMany({
            data: resultsData
          });
        }

        await clearRedisAnswers(examCode, updated.userId);
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update candidate status:", error);
    return { success: false, error: error.message };
  }
}

export async function submitExamAnswers(
  paperDetailId: string,
  userId: string,
  selectedOptions: number[],
  numericAnswer: number | null,
  timeSpent: number
) {
  try {
    const examCode = await redis.get(`user:exam:${userId}`);
    if (!examCode) return { success: false, error: "User active exam session expired or not found" };

    await saveRedisAnswer(examCode, userId, paperDetailId, {
      selectedOptions,
      numericAnswer,
      timeSpent
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save answer in Redis:", error);
    return { success: false, error: error.message };
  }
}

export async function getParticipantAnswers(paperId: string, userId: string) {
  try {
    const examCode = await redis.get(`user:exam:${userId}`);
    if (!examCode) return { success: true, data: [] };

    const answers = await getRedisAnswers(examCode, userId);
    const results: any[] = [];
    for (const [detailId, ans] of Object.entries(answers)) {
      if (ans.selectedOptions && ans.selectedOptions.length > 0) {
        ans.selectedOptions.forEach((opt: number) => {
          results.push({
            paperDetailId: detailId,
            selectedOption: opt
          });
        });
      }
    }
    return { success: true, data: results };
  } catch (error: any) {
    console.error("Failed to get participant answers from Redis:", error);
    return { success: false, error: error.message };
  }
}

export async function getCandidateExams(userId: string) {
  try {
    // Ensure the user record is provisioned in the local database
    const currentUser = await getCurrentUser().catch(() => null);

    const targetUserIds = [userId];
    if (currentUser?.id && !targetUserIds.includes(currentUser.id)) {
      targetUserIds.push(currentUser.id);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: { in: targetUserIds } },
          ...(currentUser?.email ? [{ email: currentUser.email }] : [])
        ]
      },
      select: { id: true, studentId: true }
    });

    if (user?.id && !targetUserIds.includes(user.id)) {
      targetUserIds.push(user.id);
    }

    const studentIds: string[] = [];
    if (user?.studentId) studentIds.push(user.studentId);

    const participants = await prisma.examParticipant.findMany({
      where: {
        OR: [
          { userId: { in: targetUserIds } },
          ...(studentIds.length > 0 ? [{ classCode: { in: studentIds } }] : [])
        ]
      },
      include: {
        session: {
          include: {
            paper: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: participants };
  } catch (error: any) {
    console.error("Failed to get candidate exams:", error);
    return { success: false, error: error.message };
  }
}

export async function getCandidateExamReview(paperId: string, userId: string) {
  try {
    // Ensure the user record is provisioned in the local database
    const currentUser = await getCurrentUser().catch(() => null);

    const targetUserIds = [userId];
    if (currentUser?.id && !targetUserIds.includes(currentUser.id)) {
      targetUserIds.push(currentUser.id);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: { in: targetUserIds } },
          ...(currentUser?.email ? [{ email: currentUser.email }] : [])
        ]
      },
      select: { id: true, studentId: true }
    });

    if (user?.id && !targetUserIds.includes(user.id)) {
      targetUserIds.push(user.id);
    }

    const studentId = user?.studentId;

    const paper = await prisma.examPaper.findFirst({
      where: {
        OR: [
          { id: paperId },
          { code: paperId }
        ]
      }
    });

    if (!paper) {
      return { success: false, error: "Exam paper not found" };
    }

    const questions = await prisma.examPaperDetails.findMany({
      where: { paperId: paper.id },
      orderBy: { questionNumber: 'asc' }
    });

    const participant = await prisma.examParticipant.findFirst({
      where: {
        session: { paperId: paper.id },
        OR: [
          { userId: { in: targetUserIds } },
          ...(studentId ? [{ classCode: studentId }] : [])
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (participant?.userId && !targetUserIds.includes(participant.userId)) {
      targetUserIds.push(participant.userId);
    }

    let responses = await prisma.examQuestionResult.findMany({
      where: {
        userId: { in: targetUserIds },
        paperDetail: {
          paperId: paper.id
        }
      }
    });

    // Fallback to Redis answers if responses haven't flushed yet
    if (responses.length === 0 && paper.code) {
      try {
        const redisAnswers = await getRedisAnswers(paper.code, userId);
        if (redisAnswers && Object.keys(redisAnswers).length > 0) {
          for (const [detailId, ans] of Object.entries(redisAnswers)) {
            const detailObj = questions.find(q => q.id === detailId);
            const correctSet = new Set<number>();
            if (detailObj) {
              if (detailObj.correctAnswer1 !== null) correctSet.add(detailObj.correctAnswer1);
              if (detailObj.correctAnswer2 !== null) correctSet.add(detailObj.correctAnswer2);
            }

            if (ans.selectedOptions && ans.selectedOptions.length > 0) {
              ans.selectedOptions.forEach((opt: number) => {
                responses.push({
                  id: `fallback_${detailId}_${opt}`,
                  paperDetailId: detailId,
                  userId,
                  selectedOption: opt,
                  numericAnswer: ans.numericAnswer || null,
                  timeSpent: ans.timeSpent || 0,
                  isCorrect: correctSet.has(opt),
                  isFlagged: false,
                  answeredAt: new Date()
                } as any);
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch redis answers fallback:", err);
      }
    }

    // Compute rich stats
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;

    questions.forEach((q) => {
      const qResponses = responses.filter(r => r.paperDetailId === q.id && r.selectedOption !== null);
      if (qResponses.length === 0) {
        skippedCount++;
      } else {
        const correctSet = new Set<number>();
        if (q.correctAnswer1 !== null) correctSet.add(q.correctAnswer1);
        if (q.correctAnswer2 !== null) correctSet.add(q.correctAnswer2);

        const userOpts = qResponses.map(r => r.selectedOption as number);
        const isAllCorrect = userOpts.length > 0 &&
          userOpts.every(opt => correctSet.has(opt)) &&
          userOpts.length === correctSet.size;

        if (isAllCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const totalQuestions = questions.length;
    const answeredCount = correctCount + incorrectCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const totalMarks = paper.totalMarks > 0 ? paper.totalMarks : totalQuestions;
    const calculatedScore = totalQuestions > 0 ? Math.round(((correctCount / totalQuestions) * totalMarks) * 10) / 10 : 0;
    const finalScore = participant?.score !== null && participant?.score !== undefined ? participant.score : calculatedScore;

    return {
      success: true,
      data: {
        paper,
        questions,
        responses,
        participant,
        stats: {
          totalQuestions,
          answeredCount,
          correctCount,
          incorrectCount,
          skippedCount,
          accuracy,
          totalMarks,
          score: finalScore
        }
      }
    };
  } catch (error: any) {
    console.error("Failed to get exam review:", error);
    return { success: false, error: error.message };
  }
}

export async function checkIfGuest(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true }
    });
    return { success: true, isGuest: user?.isGuest || false };
  } catch (error: any) {
    return { success: false, isGuest: false };
  }
}

export async function linkGuestAccount(
  guestUserId: string,
  supabaseUserId: string,
  email?: string,
  role?: string,
  age?: number,
  grade?: string,
  examType?: string,
  monthsToExam?: number,
  stream?: string,
  subjects?: string[]
) {
  try {
    const guestUser = await prisma.user.findUnique({
      where: { id: guestUserId }
    });

    if (!guestUser) {
      return { success: false, error: "Guest user not found" };
    }

    const existingNewUser = await prisma.user.findUnique({
      where: { id: supabaseUserId }
    });

    if (existingNewUser) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: supabaseUserId },
          data: {
            email: email,
            role: (role === "host" || role === "HOST") ? "HOST" : "STUDENT",
            age,
            grade,
            examType,
            monthsToExam,
            stream,
            subjects: subjects || [],
            isGuest: false,
            emailVerified: new Date(),
          }
        }),
        prisma.examParticipant.updateMany({
          where: { userId: guestUserId },
          data: { userId: supabaseUserId }
        }),
        prisma.examQuestionResult.updateMany({
          where: { userId: guestUserId },
          data: { userId: supabaseUserId }
        }),
        prisma.examPaperAccess.updateMany({
          where: { userId: guestUserId },
          data: { userId: supabaseUserId }
        }),
        prisma.user.delete({
          where: { id: guestUserId }
        })
      ]);
    } else {
      await prisma.$transaction([
        prisma.user.create({
          data: {
            id: supabaseUserId,
            email: email,
            name: guestUser.name,
            role: (role === "host" || role === "HOST") ? "HOST" : "STUDENT",
            isGuest: false,
            age,
            grade,
            examType,
            monthsToExam,
            stream,
            subjects: subjects || [],
            emailVerified: new Date(),
          }
        }),
        prisma.examParticipant.updateMany({
          where: { userId: guestUserId },
          data: { userId: supabaseUserId }
        }),
        prisma.examQuestionResult.updateMany({
          where: { userId: guestUserId },
          data: { userId: supabaseUserId }
        }),
        prisma.examPaperAccess.updateMany({
          where: { userId: guestUserId },
          data: { userId: supabaseUserId }
        }),
        prisma.user.delete({
          where: { id: guestUserId }
        })
      ]);
    }
    if (prismaTeso) {
      const mappedRole = (role === "host" || role === "HOST") ? "HOST" : "STUDENT";
      if (mappedRole === "STUDENT") {
        prismaTeso.user.upsert({
          where: { id: supabaseUserId },
          update: {
            email: email,
            name: guestUser.name,
            role: mappedRole,
            age,
            grade,
            examType,
            monthsToExam,
            stream,
            subjects: subjects || [],
            isGuest: false,
            emailVerified: new Date(),
          },
          create: {
            id: supabaseUserId,
            email: email,
            name: guestUser.name,
            role: mappedRole,
            age,
            grade,
            examType,
            monthsToExam,
            stream,
            subjects: subjects || [],
            isGuest: false,
            emailVerified: new Date(),
          }
        }).catch(err => console.error("Failed to sync guest linking to Teso main DB:", err));
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error linking guest account:", error);
    return { success: false, error: error.message };
  }
}

export async function registerDbUser(
  userId: string,
  email: string,
  name: string,
  role: string,
  age?: number,
  grade?: string,
  examType?: string,
  monthsToExam?: number,
  stream?: string,
  subjects?: string[]
) {
  try {
    if (!userId || !email || !name) {
      return { success: false, error: "Missing required registration parameters." };
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      return { success: false, error: "Name must be at least 2 characters." };
    }
    const mappedRole = (role === "host" || role === "HOST") ? "HOST" : "STUDENT";
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: cleanEmail,
        name: cleanName,
        role: mappedRole,
        age,
        grade,
        examType,
        monthsToExam,
        stream,
        subjects: subjects || [],
        isGuest: false,
        emailVerified: new Date(),
      },
      create: {
        id: userId,
        email,
        name,
        role: mappedRole,
        age,
        grade,
        examType,
        monthsToExam,
        stream,
        subjects: subjects || [],
        isGuest: false,
        emailVerified: new Date(),
      }
    });

    if (prismaTeso && mappedRole === "STUDENT") {
      prismaTeso.user.upsert({
        where: { id: userId },
        update: {
          email,
          name,
          role: mappedRole,
          age,
          grade,
          examType,
          monthsToExam,
          stream,
          subjects: subjects || [],
          isGuest: false,
          emailVerified: new Date(),
        },
        create: {
          id: userId,
          email,
          name,
          role: mappedRole,
          age,
          grade,
          examType,
          monthsToExam,
          stream,
          subjects: subjects || [],
          isGuest: false,
          emailVerified: new Date(),
        }
      }).catch(err => console.error("Failed to sync registered user to Teso main DB:", err));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to register DB user:", error);
    return { success: false, error: error.message };
  }
}

