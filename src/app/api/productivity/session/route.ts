import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/db';

const sessionSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  duration: z.number().min(1, 'Duration is required'),
  focusScore: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  scheduleId: z.string().optional(),
  taskId: z.string().optional(),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthenticatedUserId();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const data = sessionSchema.parse(body);
    
    // Create study session
    const session = await db.studySession.create({
      data: {
        subject: data.subject,
        startTime: new Date(Date.now() - data.duration * 60 * 1000),
        endTime: new Date(),
        duration: data.duration,
        focusScore: data.focusScore,
        notes: data.notes,
        userId: payload.userId,
      },
    });

    const completedAt = session.endTime || new Date();
    const existingSessionTask = data.taskId
      ? await db.task.findFirst({
          where: {
            id: data.taskId,
            userId: payload.userId,
          },
        })
      : await db.task.findFirst({
          where: {
            userId: payload.userId,
            subject: data.subject,
            status: { not: 'completed' },
            tags: { contains: 'study-session' },
          },
          orderBy: { dueDate: 'asc' },
        });

    if (existingSessionTask) {
      await db.task.update({
        where: { id: existingSessionTask.id },
        data: {
          status: 'completed',
          completedAt,
          actualMinutes: data.duration,
        },
      });
    } else {
      const maxOrder = await db.task.aggregate({
        where: { userId: payload.userId },
        _max: { order: true },
      });

      await db.task.create({
        data: {
          title: data.title?.trim() || data.notes?.trim() || `${data.subject} Study Session`,
          description: `Completed study session for ${data.subject}.`,
          status: 'completed',
          priority: 'medium',
          dueDate: completedAt,
          completedAt,
          subject: data.subject,
          tags: JSON.stringify(['study-session', 'logged-session']),
          estimatedMinutes: data.duration,
          actualMinutes: data.duration,
          order: (maxOrder._max.order || 0) + 1,
          userId: payload.userId,
        },
      });
    }

    if (data.scheduleId) {
      await db.schedule.update({
        where: { id: data.scheduleId },
        data: { completed: true },
      }).catch(() => undefined);
    }
    
    // Update or create productivity log for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingLog = await db.productivityLog.findFirst({
      where: {
        userId: payload.userId,
        date: today,
      },
    });
    
    if (existingLog) {
      await db.productivityLog.update({
        where: { id: existingLog.id },
        data: {
          studyHours: existingLog.studyHours + data.duration / 60,
          focusScore: data.focusScore
            ? (existingLog.focusScore * existingLog.studyHours + data.focusScore * (data.duration / 60)) /
              (existingLog.studyHours + data.duration / 60)
            : existingLog.focusScore,
        },
      });
    } else {
      await db.productivityLog.create({
        data: {
          date: today,
          studyHours: data.duration / 60,
          focusScore: data.focusScore || 0,
          userId: payload.userId,
        },
      });
    }
    
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Log session error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
