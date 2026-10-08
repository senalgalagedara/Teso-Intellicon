"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logout } from "@teso/auth/actions";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function loginUser(formData: z.infer<typeof LoginSchema>) {
  try {
    const validatedFields = LoginSchema.safeParse(formData);
    
    if (!validatedFields.success) {
      return { error: "Invalid fields provided." };
    }

    const { email, password } = validatedFields.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || (!user.password && !user.firebaseUid)) {
      return { error: "User doesn't exist or uses another sign-in method." };
    }

    if (!user.password) {
      return { error: "Invalid credentials." };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return { error: "Invalid credentials." };
    }

    await createSession(user.id);
    return { success: "Logged in successfully", role: user.role };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Something went wrong during login." };
  }
}

export async function logoutUser() {
  await clearSession();
  try {
    await logout();
  } catch (error) {
    console.error("Failed to sign out from Supabase:", error);
  }
  redirect("/auth/sign-in");
}
