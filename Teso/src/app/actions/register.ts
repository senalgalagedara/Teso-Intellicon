"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getRandomAvatar } from "@/lib/avatars";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["STUDENT"]).default("STUDENT"),
  
  // Optional fields for student profile
  age: z.number().optional(),
  grade: z.string().optional(),
  examType: z.string().optional(),
  monthsToExam: z.number().optional(),
  stream: z.string().optional(),
  subjects: z.array(z.string()).optional(),
});

export async function registerUser(formData: z.infer<typeof RegisterSchema>) {
  const validatedFields = RegisterSchema.safeParse(formData);

  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const { 
    email, 
    password, 
    name, 
    role,
    age,
    grade,
    examType,
    monthsToExam,
    stream,
    subjects
  } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
        image: getRandomAvatar(),
        age,
        grade,
        examType,
        monthsToExam,
        stream,
        subjects,
      },
    });

    return { success: "User created!" };
  } catch (error) {
    console.error("Registration Error:", error);
    return { error: "Something went wrong!" };
  }
}

export async function createProfileAfterSignUp(
  userId: string,
  email: string,
  name: string,
  age?: number,
  grade?: string,
  examType?: string,
  monthsToExam?: number,
  stream?: string,
  subjects?: string[],
  avatarUrl?: string
) {
  const chosenAvatar = avatarUrl || getRandomAvatar();
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email,
        name,
        role: "STUDENT",
        age,
        grade,
        examType,
        monthsToExam,
        stream,
        subjects: subjects || [],
        isGuest: false,
        emailVerified: new Date(),
        ...(avatarUrl ? { image: avatarUrl } : {}),
      },
      create: {
        id: userId,
        email,
        name,
        role: "STUDENT",
        image: chosenAvatar,
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
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create profile:", error);
    return { success: false, error: error.message };
  }
}
