import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/productivity - Get productivity stats
export async function GET(request: Request) {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'week':
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get productivity logs
    const logs = await prisma.productivityLog.findMany({
      where: {
        userId: userPayload.userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    // Get study sessions
    const sessions = await prisma.studySession.findMany({
      where: {
        userId: userPayload.userId,
        startTime: { gte: startDate },
      },
      orderBy: { startTime: 'desc' },
    });

    // Get focus sessions
    const focusSessions = await prisma.focusSession.findMany({
      where: {
        userId: userPayload.userId,
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Calculate stats
    const totalStudyHours = logs.reduce((acc, log) => acc + log.studyHours, 0);
    const totalTasksCompleted = logs.reduce((acc, log) => acc + log.tasksCompleted, 0);
    const avgFocusScore = logs.length > 0
      ? logs.reduce((acc, log) => acc + log.focusScore, 0) / logs.length
      : 0;
    const totalPomodoroSessions = focusSessions.filter(s => s.type === 'work' && s.completed).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudyHours: Math.round(totalStudyHours * 10) / 10,
        totalTasksCompleted,
        avgFocusScore: Math.round(avgFocusScore),
        totalPomodoroSessions,
        totalSessions: sessions.length,
        period,
      },
      logs: logs.map(log => ({
        ...log,
        peakHours: log.peakHours ? JSON.parse(log.peakHours) : [],
      })),
      sessions: sessions.map(s => ({
        ...s,
        focusScore: s.focusScore || 0,
      })),
    });
  } catch (error) {
    console.error('Get productivity error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/productivity - Log productivity data
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
    const { type, data } = body;

    let result;

    switch (type) {
      case 'session': {
        // Log a study session
        result = await prisma.studySession.create({
          data: {
            subject: data.subject,
            topic: data.topic,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null,
            duration: data.duration || 0,
            focusScore: data.focusScore,
            notes: data.notes,
            productivity: data.productivity || 0,
            userId: userPayload.userId,
          },
        });
        break;
      }

      case 'pomodoro': {
        // Log a focus session
        result = await prisma.focusSession.create({
          data: {
            type: data.type,
            duration: data.duration,
            startedAt: new Date(),
            endedAt: new Date(),
            completed: data.completed,
            interrupted: !data.completed,
            task: data.task,
            userId: userPayload.userId,
          },
        });
        break;
      }

      case 'daily_log': {
        // Create or update daily productivity log
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        result = await prisma.productivityLog.upsert({
          where: {
            userId_date: {
              userId: userPayload.userId,
              date: today,
            },
          },
          update: {
            studyHours: data.studyHours,
            tasksCompleted: data.tasksCompleted,
            focusScore: data.focusScore,
            pomodoroSessions: data.pomodoroSessions,
            mood: data.mood,
            notes: data.notes,
          },
          create: {
            date: today,
            studyHours: data.studyHours || 0,
            tasksCompleted: data.tasksCompleted || 0,
            focusScore: data.focusScore || 0,
            pomodoroSessions: data.pomodoroSessions || 0,
            mood: data.mood,
            notes: data.notes,
            userId: userPayload.userId,
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid log type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Productivity logged successfully',
    });
  } catch (error) {
    console.error('Log productivity error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
