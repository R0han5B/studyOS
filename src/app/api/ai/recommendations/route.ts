import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateAIResponse } from '@/lib/ai-service';

export async function GET() {
  try {
    const payload = await getAuthenticatedUserId();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get recent tasks and sessions
    const [recentTasks, recentSessions, productivityLogs] = await Promise.all([
      db.task.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.studySession.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.productivityLog.findMany({
        where: { userId: payload.userId },
        orderBy: { date: 'desc' },
        take: 7,
      }),
    ]);
    
    const prompt = `Based on the following user activity, provide 5 quick, actionable recommendations for today.

Recent Tasks: ${JSON.stringify(recentTasks.map(t => ({ title: t.title, status: t.status, priority: t.priority })))}
Recent Study Sessions: ${JSON.stringify(recentSessions.map(s => ({ subject: s.subject, duration: s.duration })))}
Recent Productivity: ${JSON.stringify(productivityLogs.map(p => ({ studyHours: p.studyHours, pomodoroSessions: p.pomodoroSessions })))}

Provide exactly 5 short, actionable recommendations as a JSON array of strings. Each recommendation should be 1-2 sentences max.`;

    const content = await generateAIResponse(
      prompt,
      'You are a helpful study assistant. Provide quick, actionable recommendations. Always respond with valid JSON only.'
    ).catch(() => '');
    
    if (!content) {
      return NextResponse.json({
        recommendations: [
          'Add one realistic task for today so your dashboard starts tracking progress.',
          'Block a short focus session for your hardest subject first.',
          'Keep task titles specific so your weekly review stays useful.',
          'Use the planner only for sessions you truly intend to complete.',
          'Review completed work tonight and carry unfinished items into tomorrow.',
        ],
      });
    }
    
    let recommendations: string[];
    try {
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      recommendations = JSON.parse(jsonContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      recommendations = [
        'Start with your most important task first',
        'Take a 5-minute break after 25 minutes of focused work',
        'Review your completed tasks to stay motivated',
        'Set specific goals for today\'s study session',
        'Stay hydrated and maintain good posture while studying',
      ];
    }
    
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
