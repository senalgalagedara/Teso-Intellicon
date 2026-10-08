import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import otpGenerator from 'otp-generator';
import dns from 'dns';
import { emailSchema } from '@/lib/auth/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid email address';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    // Check if user already exists in Teso main DB
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({
        code: "user_already_exists",
        message: "User already registered"
      }, { status: 400 });
    }

    const code = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    // Store code
    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    // Send email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing EMAIL_USER or EMAIL_PASS environment variables");
      console.log(`[DEV] Verification code for ${email}: ${code}`);
      return NextResponse.json({ error: 'Server email configuration missing. Check .env file.' }, { status: 500 });
    }

    // Resolve smtp.gmail.com to IPv4 explicitly to avoid IPv6 timeouts
    const smtpHost = await new Promise<string>((resolve) => {
      dns.resolve4('smtp.gmail.com', (err, addresses) => {
        if (err || !addresses || !addresses.length) {
          resolve('smtp.gmail.com');
        } else {
          resolve(addresses[0]);
        }
      });
    });

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: 587,
      secure: false, // use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        servername: 'smtp.gmail.com',
        rejectUnauthorized: false
      }
    });

    try {
      await transporter.sendMail({
        from: `"TESO Education" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Verification Code - TESO',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Verify Your Email</h2>
            <p style="color: #333; font-size: 16px;">Hello,</p>
            <p style="color: #333; font-size: 16px;">Thank you for registering with TESO. Please use the following verification code to complete your sign-up:</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2026 TESO Education. All rights reserved.</p>
          </div>
        `,
      });
    } catch (mailError: any) {
      console.error("Failed to send email via SMTP:", mailError);

      // In local development or if running on localhost, fall back to console logging
      // so that developer is not blocked by ISP or firewall port blocks.
      const isDev = process.env.NODE_ENV === 'development' || req.headers.get('host')?.includes('localhost');
      if (isDev) {
        console.log(`\n==================================================`);
        console.log(`[DEV FALLBACK] Email failed to send due to network/SMTP blocks.`);
        console.log(`Verification code for ${email}: ${code}`);
        console.log(`==================================================\n`);
        return NextResponse.json({ message: 'Code logged to console (dev fallback)' });
      }
      throw mailError;
    }

    return NextResponse.json({ message: 'Code sent' });
  } catch (error: any) {
    console.error("Send code error:", error);
    return NextResponse.json({ error: error.message || 'Failed to send code' }, { status: 500 });
  }
}
