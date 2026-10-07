import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics - Get analytics data
export async function GET() {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get productivity logs for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const productivityLogs = await prisma.productivityLog.findMany({
      where: {
        userId: userPayload.userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // Get tasks stats
    const tasks = await prisma.task.findMany({
      where: { userId: userPayload.userId },
    });

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

    // Get study sessions
    const studySessions = await prisma.studySession.findMany({
      where: {
        userId: userPayload.userId,
        startTime: { gte: thirtyDaysAgo },
      },
    });

    // Calculate total study hours
    const totalMinutes = studySessions.reduce((acc, session) => acc + (session.duration || 0), 0);
    const totalHours = totalMinutes / 60;

    // Get skills
    const skills = await prisma.skill.findMany({
      where: { userId: userPayload.userId },
    });

    // Calculate weekly data
    const weeklyData = calculateWeeklyData(productivityLogs);

    // Calculate subject distribution
    const subjectDistribution = calculateSubjectDistribution(studySessions);

    return NextResponse.json({
      success: true,
      overview: {
        totalStudyHours: Math.round(totalHours * 10) / 10,
        totalSessions: studySessions.length,
        tasksCompleted: completedTasks,
        tasksPending: pendingTasks,
        tasksInProgress: inProgressTasks,
        averageFocusScore: calculateAverage(productivityLogs.map(l => l.focusScore)),
        currentStreak: calculateStreak(productivityLogs),
      },
      weeklyData,
      subjectDistribution,
      skills: skills.map(s => ({
        ...s,
        progress: s.progress || 0,
      })),
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateWeeklyData(logs: any[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weekData: { day: string; date: string; hours: number; tasks: number; focusScore: number; }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayLog = logs.find(l => new Date(l.date).toDateString() === date.toDateString());
    
    weekData.push({
      day: days[date.getDay()],
      date: date.toISOString().split('T')[0],
      hours: dayLog?.studyHours || 0,
      tasks: dayLog?.tasksCompleted || 0,
      focusScore: dayLog?.focusScore || 0,
    });
  }

  return weekData;
}

function calculateSubjectDistribution(sessions: any[]) {
  const distribution: Record<string, number> = {};
  
  sessions.forEach(session => {
    if (session.subject) {
      distribution[session.subject] = (distribution[session.subject] || 0) + session.duration;
    }
  });

  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  return Object.entries(distribution).map(([name, minutes], index) => ({
    name,
    value: Math.round((minutes / total) * 100),
    minutes: Math.round(minutes),
    color: colors[index % colors.length],
  }));
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calculateStreak(logs: any[]): number {
  if (logs.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const hasLog = logs.some(l => new Date(l.date).toDateString() === date.toDateString());
    
    if (hasLog) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  
  return streak;
}
