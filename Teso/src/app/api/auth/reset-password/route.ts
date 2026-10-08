import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { hashPassword } from '@/lib/auth/password';
import { resetPasswordSchema } from '@/lib/auth/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Input
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { token, password } = result.data;
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Verify token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: hashedToken,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    if (verificationToken.expires < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
    }

    // 3. Hash new password and update user
    const newHashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { email },
      data: {
        password: newHashedPassword,
        // Reset login attempts and locks when password is changed
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        refreshTokenHash: null, // Invalidate all active sessions
      },
    });

    // 4. Delete the token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: hashedToken,
        },
      },
    });

    return NextResponse.json({ message: 'Password has been reset successfully' }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
