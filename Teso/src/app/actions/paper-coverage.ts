'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function getDbUserId(): Promise<string | null> {
  const firebaseUser = await getCurrentUser();
  if (!firebaseUser?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: firebaseUser.email }, select: { id: true } });
  return user?.id ?? null;
}

/** Returns all cellKeys the current user has marked as done. */
export async function fetchPaperCoverage(): Promise<{ cellKeys: string[] }> {
  const userId = await getDbUserId();
  if (!userId) return { cellKeys: [] };

  const rows = await prisma.paperCoverage.findMany({
    where: { userId },
    select: { cellKey: true },
  });

  return { cellKeys: rows.map((r) => r.cellKey) };
}

/**
 * Toggle a single cell.
 * Returns the new state: true = now marked done, false = now unmarked.
 */
export async function togglePaperCoverage(cellKey: string): Promise<{ done: boolean; error?: string }> {
  const userId = await getDbUserId();
  if (!userId) return { done: false, error: 'Not authenticated' };

  const existing = await prisma.paperCoverage.findUnique({
    where: { userId_cellKey: { userId, cellKey } },
  });

  if (existing) {
    await prisma.paperCoverage.delete({ where: { userId_cellKey: { userId, cellKey } } });
    return { done: false };
  } else {
    await prisma.paperCoverage.create({ data: { userId, cellKey } });
    return { done: true };
  }
}
