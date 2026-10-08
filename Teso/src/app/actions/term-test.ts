"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface TermTestInput {
  grade: number;
  term: number;
  subject: string;
  marks: number;
  totalMarks: number;
}

export async function upsertTermTestMark(data: TermTestInput, userId: string) {
  try {
    if (!userId) return { error: "User ID is required" };
    await prisma.termTestMark.upsert({
      where: {
        userId_grade_term_subject: {
          userId,
          grade: data.grade,
          term: data.term,
          subject: data.subject,
        },
      },
      update: {
        marks: data.marks,
        totalMarks: data.totalMarks,
      },
      create: {
        userId,
        grade: data.grade,
        term: data.term,
        subject: data.subject,
        marks: data.marks,
        totalMarks: data.totalMarks,
      },
    });

    revalidatePath("/dashboard"); 
    return { success: true };
  } catch (error) {
    console.error("Failed to save mark:", error);
    return { error: "Failed to save mark" };
  }
}

export async function deleteTermTestMark(id: string, userId: string) {
  try {
    if (!userId) return { error: "User ID is required" };

    await prisma.termTestMark.delete({
      where: {
        id,
        userId, 
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete" };
  }
}

export async function getTermTestMarks(userId: string) {
  if (!userId) return [];

  return await prisma.termTestMark.findMany({
    where: { userId },
    orderBy: [
      { grade: 'asc' },
      { term: 'asc' },
      { subject: 'asc' }
    ]
  });
}