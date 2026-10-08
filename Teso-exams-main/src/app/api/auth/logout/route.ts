import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('accessToken')?.value;
    
    if (accessToken) {
      try {
        const payload = await verifyJWT(accessToken);
        // Clear refresh token hash in DB to invalidate all active refresh sessions
        await prisma.user.update({
          where: { id: payload.userId },
          data: { refreshTokenHash: null },
        });
      } catch (error) {
        // Token might be expired, ignore error but proceed to clear cookies
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear cookies
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
