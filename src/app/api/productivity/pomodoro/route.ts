import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/db';

const pomodoroSchema = z.object({
  date: z.string(),
  pomodoroSessions: z.number().min(0),
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
    const data = pomodoroSchema.parse(body);
    
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);
    
    const existingLog = await db.productivityLog.findFirst({
      where: {
        userId: payload.userId,
        date,
      },
    });
    
    if (existingLog) {
      const updated = await db.productivityLog.update({
        where: { id: existingLog.id },
        data: {
          pomodoroSessions: data.pomodoroSessions,
          studyHours: existingLog.studyHours + 0.5, // Each pomodoro adds ~25 min
        },
      });
      return NextResponse.json({ log: updated });
    } else {
      const created = await db.productivityLog.create({
        data: {
          date,
          pomodoroSessions: data.pomodoroSessions,
          studyHours: 0.5,
          userId: payload.userId,
        },
      });
      return NextResponse.json({ log: created });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Log pomodoro error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
