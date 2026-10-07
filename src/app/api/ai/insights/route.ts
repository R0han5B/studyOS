import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAIInsights } from '@/lib/ai-service';

function buildGeneralCoachReply(question: string) {
  const normalized = question.trim().toLowerCase();

  if (/^(hi|hey|hello|yo)\b/.test(normalized)) {
    return 'Hey, how can I help you today? I can help with focus, planning, study strategy, revision structure, or building a study plan even before you have much data in the app.';
  }

  if (/(study plan|schedule|planner)/.test(normalized)) {
    return 'Absolutely. I can help you build a study plan right now. Tell me your subjects, exam date, how many hours you can study each day, and what time you want to start, and I will help you structure it.';
  }

  if (/(focus|concentrat)/.test(normalized)) {
    return 'A simple way to improve focus is to study in short blocks, remove one distraction before you begin, and start with a very small target like 25 minutes on one topic. If you want, I can also help you build a focus routine for your day.';
  }

  if (/(prioriti|subject)/.test(normalized)) {
    return 'A good default is to prioritize subjects that are closest to the exam, hardest for you, or carrying unfinished work. If you share your subjects and exam timeline, I can help rank them properly.';
  }

  if (/(weak|improve|better)/.test(normalized)) {
    return 'Even without much app data yet, a strong starting point is to look at three things: which subjects you avoid, where you make repeated mistakes, and what takes you the longest to finish. I can help you turn that into a concrete improvement plan.';
  }

  return 'I can still help even before you build up study history here. Ask me about planning, focus, revision, exam prep, or time management, and once you log more activity I will also tailor the advice to your actual records.';
}

// POST /api/ai/insights - Generate AI insights
export async function POST(request: Request) {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { question } = body;

    // Get user's data for analysis
    const [user, tasks, studySessions, skills] = await Promise.all([
      prisma.user.findUnique({ where: { id: userPayload.userId }, select: { targetRole: true, careerGoal: true } }),
      prisma.task.findMany({
        where: { userId: userPayload.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.studySession.findMany({
        where: { userId: userPayload.userId },
        orderBy: { startTime: 'desc' },
        take: 30,
      }),
      prisma.skill.findMany({
        where: { userId: userPayload.userId },
      }),
    ]);

    // Calculate statistics
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalStudyMinutes = studySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    
    // Calculate average focus score from sessions
    const avgFocusScore = studySessions.length > 0 
      ? Math.round(studySessions.reduce((acc, s) => acc + (s.focusScore || 75), 0) / studySessions.length)
      : 75;

    // Subject analysis
    const subjectStats: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(task => {
      if (task.subject) {
        if (!subjectStats[task.subject]) {
          subjectStats[task.subject] = { total: 0, completed: 0 };
        }
        subjectStats[task.subject].total++;
        if (task.status === 'completed') {
          subjectStats[task.subject].completed++;
        }
      }
    });

    const subjectReport = Object.entries(subjectStats)
      .map(([subject, stats]) => {
        const completion = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        return {
          subject,
          totalTasks: stats.total,
          completedTasks: stats.completed,
          completionRate: completion,
        };
      })
      .sort((a, b) => b.totalTasks - a.totalTasks || a.completionRate - b.completionRate);

    const report = {
      totalTasks,
      completedTasks,
      completionRate,
      totalStudyMinutes,
      totalStudyHours: Math.round((totalStudyMinutes / 60) * 10) / 10,
      totalStudySessions: studySessions.length,
      avgFocusScore,
      activeSubjects: Object.keys(subjectStats).length,
      trackedSkills: skills.length,
      targetRole: user?.targetRole || null,
      careerGoal: user?.careerGoal || null,
      upcomingDeadlines: tasks
        .filter((task) => task.dueDate && task.status !== 'completed')
        .slice(0, 8)
        .map((task) => ({ title: task.title, subject: task.subject, dueDate: task.dueDate })),
      subjectReport,
      generatedAt: new Date().toISOString(),
    };

    if (totalTasks === 0 && studySessions.length === 0 && skills.length === 0) {
      if (question) {
        return NextResponse.json({
          success: true,
          insights: [],
          learningStyle: {
            Visual: 0,
            'Reading/Writing': 0,
            Auditory: 0,
            Kinesthetic: 0,
          },
          studyTip: 'Track your first task or study session to unlock personalized insights.',
          answer: buildGeneralCoachReply(question),
          report,
          generatedAt: report.generatedAt,
        });
      }

      return NextResponse.json({
        success: true,
        insights: [],
        learningStyle: {
          Visual: 0,
          'Reading/Writing': 0,
          Auditory: 0,
          Kinesthetic: 0,
        },
        studyTip: 'Track your first task or study session to unlock personalized insights.',
        report,
        generatedAt: report.generatedAt,
      });
    }

    // Generate AI insights
    const result = await generateAIInsights({
      completionRate,
      totalStudyMinutes,
      avgFocusScore,
      subjectStats,
      skills: skills.map(s => ({
        name: s.name,
        level: s.level,
        progress: s.progress,
      })),
      targetRole: user?.targetRole || undefined,
      careerGoal: user?.careerGoal || undefined,
      upcomingDeadlines: tasks
        .filter((task) => task.dueDate && task.status !== 'completed')
        .slice(0, 8)
        .map((task) => ({
          title: task.title,
          subject: task.subject,
          dueDate: task.dueDate!.toISOString().split('T')[0],
        })),
      question,
    });

    return NextResponse.json({
      success: true,
      insights: result.insights,
      learningStyle: result.learningStyle,
      studyTip: result.studyTip,
      answer: result.answer,
      report,
      generatedAt: report.generatedAt,
    });
  } catch (error) {
    console.error('Generate AI insights error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
