import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2 } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return new NextResponse('Missing key parameter', { status: 400 });
  }

  // Basic security: only allow keys within the exam-papers folder
  if (!key.startsWith('exam-papers/')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    const response = await r2.send(command);

    if (!response.Body) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // AWS SDK v3 — transformToByteArray() streams the body to a Uint8Array
    const buffer = await (response.Body as any).transformToByteArray();
    const contentType = response.ContentType || 'image/png';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    console.error('R2 image fetch error:', error);
    return new NextResponse('Image not found', { status: 404 });
  }
}
