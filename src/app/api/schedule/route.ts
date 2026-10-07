import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

function combineDateAndTime(dateInput: string | Date, time: string) {
  const baseDate = new Date(dateInput);
  const [hours, minutes] = time.split(':').map(Number);
  baseDate.setHours(hours || 0, minutes || 0, 0, 0);
  return baseDate;
}

function calculateDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return Math.max(end - start, 30);
}

export async function GET() {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const schedules = await prisma.schedule.findMany({
      where: { userId: userPayload.userId },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      schedules: schedules.map((schedule) => ({
        ...schedule,
        scheduleData: schedule.scheduleData ? JSON.parse(schedule.scheduleData) : null,
      })),
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      subject,
      date,
      startTime,
      endTime,
      difficulty = 'medium',
      priority = 'medium',
      addToTasks = true,
    } = body;

    if (!title || !subject || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Title, subject, date, start time, and end time are required' },
        { status: 400 }
      );
    }

    const startDate = combineDateAndTime(date, startTime);
    const endDate = combineDateAndTime(date, endTime);
    const durationMinutes = calculateDurationMinutes(startTime, endTime);

    let task: Awaited<ReturnType<typeof prisma.task.create>> | null = null;
    if (addToTasks) {
      const maxOrder = await prisma.task.aggregate({
        where: { userId: userPayload.userId },
        _max: { order: true },
      });

      task = await prisma.task.create({
        data: {
          title,
          description: `Planned study session from ${startTime} to ${endTime}.`,
          priority,
          dueDate: startDate,
          subject,
          tags: JSON.stringify(['study-session', 'planner-session']),
          estimatedMinutes: durationMinutes,
          order: (maxOrder._max.order || 0) + 1,
          userId: userPayload.userId,
        },
      });
    }

    const schedule = await prisma.schedule.create({
      data: {
        title,
        description: `Planned study session for ${subject}`,
        subject,
        startDate,
        endDate,
        hoursPerDay: durationMinutes / 60,
        difficulty,
        priority,
        scheduleData: JSON.stringify({
          type: 'planner-session',
          startTime,
          endTime,
          difficulty,
          priority,
          taskId: task?.id || null,
        }),
        aiGenerated: false,
        userId: userPayload.userId,
      },
    });

    return NextResponse.json({
      success: true,
      schedule: {
        ...schedule,
        scheduleData: schedule.scheduleData ? JSON.parse(schedule.scheduleData) : null,
      },
      task: task
        ? {
            ...task,
            tags: task.tags ? JSON.parse(task.tags) : [],
          }
        : null,
      message: 'Session created successfully',
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
