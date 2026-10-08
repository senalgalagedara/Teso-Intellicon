import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import type { Task } from '@/types/timetable';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await prisma.timetableTask.findMany({
      where: { userId: user.id },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET /api/timetable/tasks error', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Omit<Task, 'id'>;
    if (!body.title || !body.startTime || !body.endTime || !body.date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const created = await prisma.timetableTask.create({
      data: {
        title: body.title,
        startTime: body.startTime,
        endTime: body.endTime,
        date: body.date,
        priority: body.priority ?? 'medium',
        color: body.color ?? null,
        description: body.description ?? null,
        zoomLink: body.zoomLink ?? null,
        teamsLink: body.teamsLink ?? null,
        meetLink: body.meetLink ?? null,
        userId: user.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/timetable/tasks error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
