import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/auth/validation';
import { sendVerificationEmail } from '@/lib/auth/email';
import { getRandomAvatar } from '@/lib/avatars';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Input Validation
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { email, password, name } = result.data;

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      // Do not leak existence of user, just send success or generic error
      // In a real app we might return 400 with 'Email already in use' depending on requirements
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    // 3. Hash Password (bcrypt salt rounds = 12)
    const hashedPassword = await hashPassword(password);

    // 4. Create user in database (Supabase PostgreSQL via Prisma)
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        image: getRandomAvatar(),
        // emailVerified is null by default
      },
    });

    // 5. Generate Verification Token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Store hashed token in DB
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashedToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // 6. Send verification email (mocked)
    await sendVerificationEmail(email, token);

    return NextResponse.json({ message: 'User registered successfully. Please verify your email.' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
