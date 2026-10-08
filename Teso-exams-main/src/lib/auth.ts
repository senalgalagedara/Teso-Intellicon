import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma, prismaTeso } from "./prisma";
import { createClient as createServerClient } from "@teso/auth/server";
import { getCachedUser, cacheUser } from "./redisService";

const secretKey = process.env.JWT_SECRET || "super-secret-key-for-dev";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({ userId, expires });
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.teso.lk';

  (await cookies()).set("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
  });
}

export async function clearSession() {
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.teso.lk';
  (await cookies()).set("session", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
  });
}

export async function getSession() {
  const session = (await cookies()).get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function getCurrentUser() {
  try {
    // 1. Try fetching session via Shared Supabase Auth (Unified system)
    const supabase = await createServerClient();
    const { data: { user: sbUser }, error } = await supabase.auth.getUser();

    if (sbUser && !error) {
      // Try to read user from Redis session cache
      const cached = await getCachedUser(sbUser.id);
      if (cached) return cached;

      // Find user in the exam platform database
      let dbUser = await prisma.user.findUnique({
        where: { id: sbUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      });

      // Retrieve user from the main Teso database if available to cross-check/fill data
      let tesoUser: any = null;
      if (prismaTeso) {
        tesoUser = await prismaTeso.user.findUnique({
          where: { id: sbUser.id }
        }).catch(err => console.error("Failed to fetch user from Teso main DB:", err));
      }

      // If user does not exist in local exam database, auto-provision from Teso main DB or Supabase info
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            id: sbUser.id,
            email: tesoUser?.email || sbUser.email!,
            name: tesoUser?.name || ((sbUser.user_metadata?.first_name || '') + ' ' + (sbUser.user_metadata?.last_name || '')).trim() || sbUser.email!.split('@')[0],
            role: tesoUser?.role || ((sbUser.user_metadata?.role as any) === 'host' || (sbUser.user_metadata?.role as any) === 'admin' || (sbUser.user_metadata?.role as any) === 'HOST' || (sbUser.user_metadata?.role as any) === 'ADMIN' ? 'HOST' : 'STUDENT'),
            image: tesoUser?.image || sbUser.user_metadata?.avatar_url || '',
            age: tesoUser?.age ?? (sbUser.user_metadata?.age ? parseInt(sbUser.user_metadata.age) : undefined),
            grade: tesoUser?.grade || sbUser.user_metadata?.grade,
            examType: tesoUser?.examType || sbUser.user_metadata?.exam_type,
            monthsToExam: tesoUser?.monthsToExam ?? (sbUser.user_metadata?.months_to_exam ? parseInt(sbUser.user_metadata.months_to_exam) : undefined),
            stream: tesoUser?.stream || sbUser.user_metadata?.stream,
            subjects: tesoUser?.subjects || sbUser.user_metadata?.subjects || [],
            isGuest: false,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        });
      } else {
        // If user already exists in exams DB, sync any newer details from Teso main DB
        if (tesoUser) {
          const needsSync =
            dbUser.name !== tesoUser.name ||
            dbUser.email !== tesoUser.email ||
            dbUser.role !== tesoUser.role;

          if (needsSync) {
            dbUser = await prisma.user.update({
              where: { id: sbUser.id },
              data: {
                email: tesoUser.email,
                name: tesoUser.name,
                role: tesoUser.role,
                image: tesoUser.image,
                age: tesoUser.age,
                grade: tesoUser.grade,
                examType: tesoUser.examType,
                monthsToExam: tesoUser.monthsToExam,
                stream: tesoUser.stream,
                subjects: tesoUser.subjects,
              },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
              },
            });
          }
        } else if (!dbUser.email) {
          // Fallback update if email is missing (e.g. from guest linking) using Supabase metadata details
          dbUser = await prisma.user.update({
            where: { id: sbUser.id },
            data: {
              email: sbUser.email!,
              name: ((sbUser.user_metadata?.first_name || '') + ' ' + (sbUser.user_metadata?.last_name || '')).trim() || dbUser.name || sbUser.email!.split('@')[0],
              role: (sbUser.user_metadata?.role as any) === 'host' || (sbUser.user_metadata?.role as any) === 'admin' || (sbUser.user_metadata?.role as any) === 'HOST' || (sbUser.user_metadata?.role as any) === 'ADMIN' ? 'HOST' : 'STUDENT',
              age: sbUser.user_metadata?.age ? parseInt(sbUser.user_metadata.age) : undefined,
              grade: sbUser.user_metadata?.grade,
              examType: sbUser.user_metadata?.exam_type,
              monthsToExam: sbUser.user_metadata?.months_to_exam ? parseInt(sbUser.user_metadata.months_to_exam) : undefined,
              stream: sbUser.user_metadata?.stream,
              subjects: sbUser.user_metadata?.subjects || [],
              isGuest: false,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
            },
          });
        }
      }

      // Also ensure this user's latest metadata is synced to Teso main DB
      if (prismaTeso) {
        const mappedRole = (sbUser.user_metadata?.role as any) === 'host' || (sbUser.user_metadata?.role as any) === 'admin' || (sbUser.user_metadata?.role as any) === 'HOST' || (sbUser.user_metadata?.role as any) === 'ADMIN' ? 'HOST' : 'STUDENT';
        if (mappedRole === "STUDENT") {
          prismaTeso.user.upsert({
            where: { id: sbUser.id },
            update: {
              email: sbUser.email!,
              name: ((sbUser.user_metadata?.first_name || '') + ' ' + (sbUser.user_metadata?.last_name || '')).trim() || sbUser.email!.split('@')[0],
              role: mappedRole,
              image: sbUser.user_metadata?.avatar_url || '',
              age: sbUser.user_metadata?.age ? parseInt(sbUser.user_metadata.age) : undefined,
              grade: sbUser.user_metadata?.grade,
              examType: sbUser.user_metadata?.exam_type,
              monthsToExam: sbUser.user_metadata?.months_to_exam ? parseInt(sbUser.user_metadata.months_to_exam) : undefined,
              stream: sbUser.user_metadata?.stream,
              subjects: sbUser.user_metadata?.subjects || [],
              isGuest: false,
              emailVerified: new Date(),
            },
            create: {
              id: sbUser.id,
              email: sbUser.email!,
              name: ((sbUser.user_metadata?.first_name || '') + ' ' + (sbUser.user_metadata?.last_name || '')).trim() || sbUser.email!.split('@')[0],
              role: mappedRole,
              image: sbUser.user_metadata?.avatar_url || '',
              age: sbUser.user_metadata?.age ? parseInt(sbUser.user_metadata.age) : undefined,
              grade: sbUser.user_metadata?.grade,
              examType: sbUser.user_metadata?.exam_type,
              monthsToExam: sbUser.user_metadata?.months_to_exam ? parseInt(sbUser.user_metadata.months_to_exam) : undefined,
              stream: sbUser.user_metadata?.stream,
              subjects: sbUser.user_metadata?.subjects || [],
              isGuest: false,
              emailVerified: new Date(),
            }
          }).catch(err => console.error("Failed to sync getCurrentUser to Teso main DB:", err));
        }
      }

      // Cache user session in Redis for 10 minutes
      await cacheUser(sbUser.id, dbUser, 600);

      return dbUser;
    }
  } catch (err) {
    console.error("Shared Supabase auth fetch failed in exam app, falling back to legacy:", err);
  }

  // 2. Fallback to legacy JWT session cookie
  const session = await getSession();
  if (!session || !session.userId) return null;

  // Try to read user from Redis session cache
  const cached = await getCachedUser(session.userId);
  if (cached) return cached;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
    });

    if (user) {
      // Cache user session in Redis for 10 minutes
      await cacheUser(session.userId, user, 600);
    }

    return user;
  } catch (error) {
    console.error("Error fetching user via legacy session:", error);
    return null;
  }
}
