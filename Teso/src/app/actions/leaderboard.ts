'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function getLeaderboardPapers(subject: string, type: string) {
  try {
    // Map UI subject to DB subject (simple case insensitive match for now)
    // In a real app, you might want a more robust mapping
    
    const papers: any[] = await prisma.pPmarks.findMany({
      where: {
        subject: {
          contains: subject,
          mode: 'insensitive'
        },
        type: type
      },
      distinct: ['paperId'],
      select: {
        paperId: true,
        paperName: true
      }
    }); // Changed logic to simple query since distinct works
    
    // Type casting because distinct on paperId might return partial objects but select is defined
    return papers.map((p: any) => ({
      id: p.paperId || '',
      name: p.paperName || 'Unknown Paper'
    })).filter((p: any) => p.id);
  } catch (error) {
    console.error("Error fetching leaderboard papers:", error);
    return [];
  }
}

export async function getLeaderboardData(paperId: string) {
  try {
    const marks = await prisma.pPmarks.findMany({
      where: {
        paperId: paperId
      },
      include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true
            }
          }
        },
      orderBy: {
        score: 'desc'
      }
    });

    const results = [];
    for (let i = 0; i < marks.length; i++) {
        const mark = marks[i];
        let avatar = mark.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mark.user.email || 'anonymous'}`;
  
        results.push({
          id: mark.id,
          rank: i + 1,
          name: mark.user.name || 'Anonymous',
          username: mark.user.email ? `@${mark.user.email.split('@')[0]}` : '@anonymous',
          score: mark.score,
          totalQuestions: mark.total,
          percentage: mark.total > 0 ? (mark.score / mark.total) * 100 : 0,
          avatar,
          timeCompleted: new Date(mark.date).toLocaleDateString(),
          attempts: 1,
          correctAnswers: mark.score,
        });
      }

    return results;
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return [];
  }
}

export async function getUserSubjectsAndProfile() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) return { subjects: [], profile: null };

    // find user by email
    const user = await prisma.user.findUnique({
      where: {
         email: currentUser.email 
      },
      select: {
        subjects: true,
        name: true,
        email: true
      }
    });

    if (!user) return { subjects: [], profile: null };

    return { 
        subjects: user.subjects || [], 
        profile: { 
            name: user.name, 
            email: user.email 
        } 
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { subjects: [], profile: null };
  }
}
