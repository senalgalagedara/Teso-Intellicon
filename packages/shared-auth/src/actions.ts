'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  console.log("[shared-auth:login] Attempting login for email:", email);

  if (!email || !password) {
    console.warn("[shared-auth:login] Missing email or password");
    return { error: 'Email and password are required.' };
  }

  try {
    const supabase = await createClient();
    console.log("[shared-auth:login] Supabase client created");
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[shared-auth:login] Supabase signInWithPassword returned error:", error);
      return { error: error.message };
    }

    console.log("[shared-auth:login] Supabase signInWithPassword successful. User ID:", data?.user?.id);
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error("[shared-auth:login] Caught exception in login action:", err);
    return { error: err.message || "An unexpected error occurred during login." };
  }
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const AVATARS = [
    "/avatars/051a18c3f9.svg",
    "/avatars/110d8a3ca7.svg",
    "/avatars/1c8af305ee.svg",
    "/avatars/2e3e2dbfbb.svg",
    "/avatars/65c02ef480.svg",
    "/avatars/6e8385f4a2.svg",
    "/avatars/7d1e909a36.svg",
    "/avatars/977dabe8c2.svg",
    "/avatars/b38b0265ed.svg",
    "/avatars/b5d87eb904.svg",
    "/avatars/d5bf27df78.svg",
    "/avatars/fa9474f211.svg",
  ];
  const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName || '',
        last_name: lastName || '',
        avatar_url: randomAvatar,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}
