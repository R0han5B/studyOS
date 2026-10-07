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
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const logs = await db.productivityLog.findMany({
      where: {
        userId: payload.userId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: 'asc' },
    });
    
    // Create a complete 7-day record
    const weeklyData: { date: string; dayName: string; studyHours: number; tasksCompleted: number; focusScore: number; pomodoroSessions: number; }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const log = logs.find(l => {
        const logDate = new Date(l.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === date.getTime();
      });
      
      weeklyData.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        studyHours: log?.studyHours || 0,
        tasksCompleted: log?.tasksCompleted || 0,
        focusScore: log?.focusScore || 0,
        pomodoroSessions: log?.pomodoroSessions || 0,
      });
    }
    
    // Get tasks completed this week
    const tasksCompletedThisWeek = await db.task.count({
      where: {
        userId: payload.userId,
        completedAt: { gte: sevenDaysAgo },
      },
    });
    
    // Get new tasks this week
    const newTasksThisWeek = await db.task.count({
      where: {
        userId: payload.userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    
    return NextResponse.json({
      weeklyData,
      summary: {
        tasksCompleted: tasksCompletedThisWeek,
        newTasks: newTasksThisWeek,
        totalStudyHours: weeklyData.reduce((acc, d) => acc + d.studyHours, 0),
        totalPomodoroSessions: weeklyData.reduce((acc, d) => acc + d.pomodoroSessions, 0),
        averageFocusScore: weeklyData.reduce((acc, d) => acc + d.focusScore, 0) / 7,
      },
    });
  } catch (error) {
    console.error('Get weekly stats error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
