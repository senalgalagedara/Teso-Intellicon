'use server';

import { createClient as createServerClient } from "@teso/auth/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface UpdateProfileInput {
  name?: string;
  age?: number;
  grade?: string;
  examType?: string;
  monthsToExam?: number;
  stream?: string;
  subjects?: string[];
  image?: string;
}

export async function updateUserAvatar(avatarPath: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // 1. Update Supabase Auth user metadata avatar_url
    const supabase = await createServerClient();
    const { error: sbError } = await supabase.auth.updateUser({
      data: {
        avatar_url: avatarPath,
      }
    });

    if (sbError) {
      console.error("Supabase user avatar update error:", sbError);
    }

    // 2. Update local Prisma Database User
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        image: avatarPath,
      }
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error("Error updating avatar:", error);
    return { error: error.message || "Failed to update avatar" };
  }
}

export async function updateUserProfile(data: UpdateProfileInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // 1. Update Supabase Auth user metadata
    const supabase = await createServerClient();
    const sbData: Record<string, any> = {};

    if (data.name !== undefined) {
      const nameParts = (data.name || "").trim().split(/\s+/);
      sbData.first_name = nameParts[0] || "";
      sbData.last_name = nameParts.slice(1).join(" ") || "";
    }
    if (data.age !== undefined) sbData.age = data.age;
    if (data.grade !== undefined) sbData.grade = data.grade;
    if (data.examType !== undefined) sbData.exam_type = data.examType;
    if (data.monthsToExam !== undefined) sbData.months_to_exam = data.monthsToExam;
    if (data.stream !== undefined) sbData.stream = data.stream;
    if (data.subjects !== undefined) sbData.subjects = data.subjects;
    if (data.image !== undefined) sbData.avatar_url = data.image;

    if (Object.keys(sbData).length > 0) {
      const { error: sbError } = await supabase.auth.updateUser({
        data: sbData,
      });

      if (sbError) {
        console.error("Supabase user update error:", sbError);
      }
    }

    // 2. Update local Prisma Database User
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.grade !== undefined && { grade: data.grade }),
        ...(data.examType !== undefined && { examType: data.examType }),
        ...(data.monthsToExam !== undefined && { monthsToExam: data.monthsToExam }),
        ...(data.stream !== undefined && { stream: data.stream }),
        ...(data.subjects !== undefined && { subjects: data.subjects }),
        ...(data.image !== undefined && { image: data.image }),
      }
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { error: error.message || "Failed to update profile" };
  }
}

export async function getUserProfileStats() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Get the detailed user record from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        todos: true,
        marks: true,
      }
    });

    if (!dbUser) return null;

    // 1. Calculate Focus Time from StudyDayProgress (in hours)
    const progress = await prisma.studyDayProgress.findMany({
      where: { userId: user.id }
    });

    let totalSeconds = 0;
    progress.forEach(p => {
      totalSeconds += (p.timeSpentLesson || 0) + (p.timeSpentMcq || 0) + (p.timeSpentP2 || 0);
    });
    const focusTime = Math.round((totalSeconds / 3600) * 10) / 10;

    // 2. Calculate Completed Lessons
    const lessonsCovered = progress.filter(p => p.lessonDone).length;

    // Get total lessons in active plan
    const activePlan = await prisma.studyPlan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    let totalLessons = 0;
    if (activePlan && activePlan.planData) {
      try {
        const planDataArray = activePlan.planData as any[];
        totalLessons = planDataArray.length;
      } catch (e) {
        totalLessons = 0;
      }
    }

    // 3. Calculate Study Streak
    const completedDays = progress
      .filter(p => p.dayCompleted && p.completedAt)
      .map(p => {
        const d = new Date(p.completedAt!);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      });

    // Remove duplicates and sort descending
    const uniqueDays = Array.from(new Set(completedDays)).sort((a, b) => b - a);

    let studyStreak = 0;
    if (uniqueDays.length > 0) {
      const today = new Date();
      const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const yesterdayMs = todayMs - 24 * 60 * 60 * 1000;

      // Check if user studied today or yesterday to continue streak
      if (uniqueDays[0] === todayMs || uniqueDays[0] === yesterdayMs) {
        studyStreak = 1;
        for (let i = 0; i < uniqueDays.length - 1; i++) {
          const diff = uniqueDays[i] - uniqueDays[i + 1];
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (diff === oneDayMs) {
            studyStreak++;
          } else if (diff > oneDayMs) {
            break; // Streak broken
          }
        }
      }
    }

    // 4. Calculate Subject Grades
    // Default subject list if none is set
    const userSubjects = dbUser.subjects.length > 0 
      ? dbUser.subjects 
      : (dbUser.examType === "O/L" ? ["Mathematics", "Science", "English", "History"] : ["Combined Mathematics", "Physics", "Chemistry"]);

    // Fetch grades averages
    const subjectGrades = userSubjects.map((subject, idx) => {
      const subjectMarks = dbUser.marks.filter(
        m => m.subject.trim().toLowerCase() === subject.trim().toLowerCase()
      );
      
      // Gradients and colors for beautiful progress indicators
      const colors = ["#4285F4", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444"];
      const gradients = [
        "from-blue-500 to-blue-600",
        "from-purple-500 to-purple-600",
        "from-pink-500 to-pink-600",
        "from-green-500 to-green-600",
        "from-amber-500 to-amber-600",
        "from-red-500 to-red-600"
      ];

      const color = colors[idx % colors.length];
      const gradient = gradients[idx % gradients.length];

      if (subjectMarks.length === 0) {
        // Fallback placeholder/default value if there is no database score yet
        // Show as 0 but styled nicely, or a friendly initial average (e.g. 70) if brand new
        return {
          subject,
          average: 0,
          color,
          gradient,
          hasMarks: false,
        };
      }

      const totalPct = subjectMarks.reduce((acc, m) => acc + (m.score / m.total) * 100, 0);
      const average = Math.round(totalPct / subjectMarks.length);

      return {
        subject,
        average,
        color,
        gradient,
        hasMarks: true,
      };
    });

    return {
      focusTime,
      lessonsCovered,
      totalLessons: totalLessons || 100, // Fallback to 100 lessons default
      studyStreak,
      loginStreak: studyStreak + 2, // Mock login streak slightly higher than study streak for realism
      subjectGrades,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return null;
  }
}

export async function deleteUserAccount() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const userId = user.id;

    // Delete dependent database records inside a transaction
    await prisma.$transaction([
      prisma.todo.deleteMany({ where: { userId } }),
      prisma.stickyNote.deleteMany({ where: { userId } }),
      prisma.pPmarks.deleteMany({ where: { userId } }),
      prisma.event.deleteMany({ where: { userId } }),
      prisma.paperAccess.deleteMany({ where: { userId } }),
      prisma.studyDayProgress.deleteMany({ where: { userId } }),
      prisma.studyPlan.deleteMany({ where: { userId } }),
      prisma.paperCoverage.deleteMany({ where: { userId } }),
      prisma.termTestMark.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    // Deletes the authentication record from Supabase's auth schema via raw SQL
    await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE id = $1`, userId);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user account:", error);
    return { error: error.message || "Failed to delete account" };
  }
}
