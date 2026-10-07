import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateCareerRoadmap } from '@/lib/ai-service';

const careerSchema = z.object({
  targetRole: z.string().trim().min(1).max(120),
  careerGoal: z.string().trim().min(1).max(300),
});

const roadmapItemSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  focus: z.string().min(1).max(500),
  minutes: z.number().int().min(30).max(180),
  dayOffset: z.number().int().min(1).max(365),
});

export async function GET() {
  const auth = await getAuthenticatedUserId();
  if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { targetRole: true, careerGoal: true } });
  return NextResponse.json({ success: true, career: user });
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const data = careerSchema.parse(await request.json());
    const user = await prisma.user.update({ where: { id: auth.userId }, data, select: { targetRole: true, careerGoal: true } });
    return NextResponse.json({ success: true, career: user });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message }, { status: 400 });
    console.error('Update career profile error:', error);
    return NextResponse.json({ success: false, error: 'Unable to save career profile' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const body = await request.json();
    const data = careerSchema.extend({
      timeframeDays: z.number().int().min(7).max(365).default(30),
      commit: z.boolean().default(false),
      roadmap: z.array(roadmapItemSchema).optional(),
    }).parse(body);
    await prisma.user.update({ where: { id: auth.userId }, data: { targetRole: data.targetRole, careerGoal: data.careerGoal } });
    const skills = await prisma.skill.findMany({ where: { userId: auth.userId }, select: { name: true, progress: true } });
    const roadmap = data.roadmap || await generateCareerRoadmap({ targetRole: data.targetRole, careerGoal: data.careerGoal, skills, timeframeDays: data.timeframeDays });

    if (!data.commit) {
      return NextResponse.json({ success: true, preview: true, roadmap, message: 'Roadmap preview generated. Review it before adding it to Tasks and Calendar.' });
    }
    const maxOrder = await prisma.task.aggregate({ where: { userId: auth.userId }, _max: { order: true } });
    let nextOrder = (maxOrder._max.order || 0) + 1;
    const created: Array<{ id: string; title: string }> = [];

    for (const item of roadmap) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + item.dayOffset);
      startDate.setHours(18, 0, 0, 0);
      const endDate = new Date(startDate.getTime() + item.minutes * 60000);
      const task = await prisma.task.create({ data: {
        title: item.title,
        description: `${item.focus} Target role: ${data.targetRole}.`,
        subject: item.subject,
        priority: item.dayOffset <= 2 ? 'high' : 'medium',
        estimatedMinutes: item.minutes,
        dueDate: startDate,
        tags: JSON.stringify(['career', 'roadmap', 'ai-generated']),
        order: nextOrder++,
        userId: auth.userId,
      } });
      await prisma.schedule.create({ data: {
        title: item.title,
        description: item.focus,
        subject: item.subject,
        startDate,
        endDate,
        hoursPerDay: item.minutes / 60,
        difficulty: 'medium',
        priority: item.dayOffset <= 2 ? 'high' : 'medium',
        scheduleData: JSON.stringify({ type: 'planner-session', startTime: '18:00', endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`, taskId: task.id }),
        aiGenerated: true,
        userId: auth.userId,
      } });
      created.push(task);
    }

    return NextResponse.json({ success: true, created: created.length, roadmap, message: 'AI career roadmap scheduled and added to your Tasks page' });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message }, { status: 400 });
    console.error('Generate career roadmap error:', error);
    return NextResponse.json({ success: false, error: 'Unable to generate roadmap' }, { status: 500 });
  }
}
