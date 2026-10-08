'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function accessPaper(accessCode: string, classCardNumber: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: 'You must be logged in to access papers' };
    }

    if (!user.dbId) {
        return { success: false, error: 'User profile not found' };
    }

    // Find the paper by access code
    // Assuming the 'code' field in TutionPaper is the access code
    const paper = await prisma.tutionPaper.findUnique({
      where: {
        code: accessCode
      }
    });

    if (!paper) {
      return { success: false, error: 'Invalid access code' };
    }

    // Check if access already exists
    const existingAccess = await prisma.paperAccess.findUnique({
      where: {
        userId_paperId: {
          userId: user.dbId,
          paperId: paper.id
        }
      }
    });

    if (existingAccess) {
        // If already accessed, just return success
        return { success: true, paperId: paper.id };
    }

    // Record the access
    await prisma.paperAccess.create({
      data: {
        userId: user.dbId,
        paperId: paper.id,
        classCardNumber: classCardNumber
      }
    });

    revalidatePath('/dashboard'); // Update metrics
    return { success: true, paperId: paper.id };

  } catch (error) {
    console.error('Error accessing paper:', error);
    return { success: false, error: 'Failed to access paper' };
  }
}
