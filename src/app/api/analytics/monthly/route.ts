import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const payload = await getAuthenticatedUserId();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const logs = await db.productivityLog.findMany({
      where: {
        userId: payload.userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });
    
    // Create a complete 30-day record
    const monthlyData: { date: string; studyHours: number; tasksCompleted: number; focusScore: number; pomodoroSessions: number; }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const log = logs.find(l => {
        const logDate = new Date(l.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === date.getTime();
      });
      
      monthlyData.push({
        date: date.toISOString().split('T')[0],
        studyHours: log?.studyHours || 0,
        tasksCompleted: log?.tasksCompleted || 0,
        focusScore: log?.focusScore || 0,
        pomodoroSessions: log?.pomodoroSessions || 0,
      });
    }
    
    // Group by week
    const weeklyGroups: { week: number; totalStudyHours: number; totalTasksCompleted: number; averageFocusScore: number; totalPomodoroSessions: number; }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = i * 7;
      const weekEnd = weekStart + 7;
      const weekData = monthlyData.slice(weekStart, weekEnd);
      
      weeklyGroups.push({
        week: i + 1,
        totalStudyHours: weekData.reduce((acc, d) => acc + d.studyHours, 0),
        totalTasksCompleted: weekData.reduce((acc, d) => acc + d.tasksCompleted, 0),
        averageFocusScore: weekData.reduce((acc, d) => acc + d.focusScore, 0) / 7,
        totalPomodoroSessions: weekData.reduce((acc, d) => acc + d.pomodoroSessions, 0),
      });
    }
    
    // Get subject breakdown from study sessions
    const sessions = await db.studySession.findMany({
      where: {
        userId: payload.userId,
        startTime: { gte: thirtyDaysAgo },
      },
    });
    
    const subjectBreakdown: Record<string, number> = {};
    sessions.forEach(session => {
      subjectBreakdown[session.subject] = (subjectBreakdown[session.subject] || 0) + session.duration;
    });
    
    return NextResponse.json({
      monthlyData,
      weeklyGroups,
      summary: {
        totalStudyHours: monthlyData.reduce((acc, d) => acc + d.studyHours, 0),
        totalPomodoroSessions: monthlyData.reduce((acc, d) => acc + d.pomodoroSessions, 0),
        averageFocusScore: monthlyData.reduce((acc, d) => acc + d.focusScore, 0) / 30,
        subjectBreakdown,
      },
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
