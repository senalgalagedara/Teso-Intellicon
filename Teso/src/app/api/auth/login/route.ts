import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/auth/validation';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Input Validation
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password } = result.data;

    // 2. Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Generic error to prevent user enumeration
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Bonus: Check for account lock after 5 failed attempts
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      return NextResponse.json({ error: 'Account is locked due to multiple failed login attempts. Please try again later.' }, { status: 403 });
    }

    // 3. Verify Password
    const isPasswordValid = user.password ? await comparePassword(password, user.password) : false;

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntil = null;

      if (newAttempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        console.warn(`[SECURITY] Account locked for email: ${email}`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          accountLockedUntil: lockUntil,
        },
      });

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 4. Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 403 });
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });

    // 5. Generate JWT Tokens
    const payload = { userId: user.id, email: user.email!, role: user.role };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    // Hash refresh token for DB storage to prevent token theft from DB leaks
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    // 6. Set HTTP-only Cookies
    const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });

    response.cookies.set({
      name: 'accessToken',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
