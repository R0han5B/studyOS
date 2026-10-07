import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateStudySchedule } from '@/lib/ai-service';

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
      subjects,
      dailyHours,
      dailyStudyHours,
      examDate,
      examDates,
      difficulties,
      priorities,
      difficultyLevels,
      priorityLevels,
      startTime = '09:00',
      addToTasks = true,
    } = body;

    const subjectsList = subjects || [];
    const hoursPerDay = parseInt(dailyHours || dailyStudyHours, 10) || 4;

    if (subjectsList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one subject is required' },
        { status: 400 }
      );
    }

    const examDatesList =
      examDates ||
      (examDate
        ? subjectsList.map((subject: string) => ({ subject, date: examDate }))
        : []);

    const difficultyList =
      difficultyLevels ||
      difficulties ||
      subjectsList.map((subject: string) => ({ subject, level: 'medium' }));

    const priorityList =
      priorityLevels ||
      priorities ||
      subjectsList.map((subject: string) => ({ subject, priority: 'medium' }));

    const result = await generateStudySchedule({
      subjects: subjectsList,
      examDates: examDatesList,
      dailyStudyHours: hoursPerDay,
      difficultyLevels: difficultyList,
      priorities: priorityList,
      preferredStartTime: startTime,
    });

    const maxOrder = await prisma.task.aggregate({
      where: { userId: userPayload.userId },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order || 0) + 1;

    const createdSchedules: Array<Record<string, unknown>> = [];
    const createdTasks: Array<Record<string, unknown>> = [];

    for (const day of result.schedule || []) {
      for (const session of day.sessions || []) {
        const sessionStart = combineDateAndTime(day.date, session.startTime);
        const sessionEnd = combineDateAndTime(day.date, session.endTime);
        const durationMinutes = calculateDurationMinutes(session.startTime, session.endTime);

        let taskId: string | null = null;
        if (addToTasks) {
          const task = await prisma.task.create({
            data: {
              title: session.focus || `${session.subject} Study Session`,
              description: `AI planned study session from ${session.startTime} to ${session.endTime}.`,
              priority: 'medium',
              dueDate: sessionStart,
              subject: session.subject,
              tags: JSON.stringify(['study-session', 'planner-session', 'ai-generated']),
              estimatedMinutes: durationMinutes,
              order: nextOrder++,
              userId: userPayload.userId,
            },
          });

          taskId = task.id;
          createdTasks.push({
            ...task,
            tags: task.tags ? JSON.parse(task.tags) : [],
          });
        }

        const schedule = await prisma.schedule.create({
          data: {
            title: session.focus || `${session.subject} Study Session`,
            description: 'AI-generated study session',
            subject: session.subject,
            startDate: sessionStart,
            endDate: sessionEnd,
            hoursPerDay: durationMinutes / 60,
            difficulty: 'medium',
            priority: 'medium',
            scheduleData: JSON.stringify({
              type: 'planner-session',
              startTime: session.startTime,
              endTime: session.endTime,
              taskId,
            }),
            aiGenerated: true,
            userId: userPayload.userId,
          },
        });

        createdSchedules.push({
          ...schedule,
          scheduleData: schedule.scheduleData ? JSON.parse(schedule.scheduleData) : null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      schedule: result.schedule,
      tips: result.tips,
      createdSchedules,
      createdTasks,
    });
  } catch (error) {
    console.error('Generate schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
