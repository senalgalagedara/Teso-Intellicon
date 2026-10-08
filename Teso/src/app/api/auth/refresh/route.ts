import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 });
    }

    // 1. Verify token signature and expiration
    const payload = await verifyJWT(refreshToken);

    // 2. Hash the received token to compare with DB
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // 3. Find user and verify hash matches (prevents reuse of compromised tokens)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.refreshTokenHash !== refreshTokenHash) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    // 4. Token Rotation: Generate new tokens
    const newPayload = { userId: user.id, email: user.email!, role: user.role };
    const newAccessToken = await signAccessToken(newPayload);
    const newRefreshToken = await signRefreshToken(newPayload);

    // 5. Update hash in DB
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    // 6. Set new cookies
    const response = NextResponse.json({ message: 'Token refreshed successfully' }, { status: 200 });

    response.cookies.set({
      name: 'accessToken',
      value: newAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set({
      name: 'refreshToken',
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
  }
}
