import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { emailSchema } from '@/lib/auth/validation';
import { sendPasswordResetEmail } from '@/lib/auth/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Input
    const result = emailSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const { email } = result.data;

    // 2. Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not leak existence of user, just pretend it was sent
      return NextResponse.json({ message: 'If an account with that email exists, we have sent a password reset link.' }, { status: 200 });
    }

    // 3. Generate Reset Token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Store hashed token (expires in 15 mins as requested)
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: hashedToken,
        },
      },
      update: {
        token: hashedToken,
        expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      },
      create: {
        identifier: email,
        token: hashedToken,
        expires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // 4. Send Email
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ message: 'If an account with that email exists, we have sent a password reset link.' }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
