import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { otpVerificationSchema } from '@/lib/auth/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = otpVerificationSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid email or code';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { email, code } = parsed.data;

    const record = await prisma.verificationCode.findUnique({
      where: { email },
    });

    if (!record) {
      console.log(`[Verify] No code found for email: ${email}`);
      return NextResponse.json({ valid: false, message: 'No code found' });
    }

    // Normalize for comparison
    const storedCode = record.code.trim();
    const inputCode = String(code).trim();

    if (storedCode !== inputCode) {
      console.log(`[Verify] Mismatch for ${email}. Stored: '${storedCode}', Input: '${inputCode}'`);
      return NextResponse.json({ valid: false, message: 'Invalid code' });
    }

    if (new Date() > record.expiresAt) {
      console.log(`[Verify] Code expired for ${email}`);
      return NextResponse.json({ valid: false, message: 'Code expired' });
    }

    // Mark user as verified in DB if they already exist
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });
    }

    // Optional: Delete code after use
    // await prisma.verificationCode.delete({ where: { email } });

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
