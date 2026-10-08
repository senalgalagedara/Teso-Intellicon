import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/redisService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip') || 'unknown';

  const windowSeconds = 15 * 60; // 15 minutes
  const limit = 500; // 500 requests

  const { success, count } = await checkRateLimit(ip, limit, windowSeconds);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later.', count },
      { status: 429 }
    );
  }

  return NextResponse.json({ success: true, count });
}
