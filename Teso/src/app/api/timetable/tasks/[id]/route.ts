import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import type { Task } from '@/types/timetable';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as Omit<Task, 'id'>;

    const updated = await prisma.timetableTask.update({
      where: { id, userId: user.id },
      data: {
        title: body.title,
        startTime: body.startTime,
        endTime: body.endTime,
        date: body.date,
        priority: body.priority || 'medium',
        color: body.color || null,
        description: body.description || null,
        zoomLink: body.zoomLink || null,
        teamsLink: body.teamsLink || null,
        meetLink: body.meetLink || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/timetable/tasks/[id] error', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.timetableTask.delete({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/timetable/tasks/[id] error', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
