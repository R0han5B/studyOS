import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyzeCareerTarget } from '@/lib/ai-service';

const requestSchema = z.object({ targetRole: z.string().trim().min(2).max(120) });

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const { targetRole } = requestSchema.parse(await request.json());
    const currentSkills = await prisma.skill.findMany({ where: { userId: auth.userId }, select: { id: true, name: true, progress: true } });
    const analysis = await analyzeCareerTarget(targetRole, currentSkills);

    const savedSkills: Array<{ id: string; name: string; progress: number; targetLevel: number | null; category: string | null }> = [];
    const recommendations: Array<{ name: string; category: string; targetLevel: number; progress: number }> = [];
    for (const recommended of analysis.skills) {
      const existing = currentSkills.find((skill) => skill.name.toLowerCase() === recommended.name.toLowerCase());
      if (existing) {
        savedSkills.push(await prisma.skill.update({ where: { id: existing.id }, data: { category: recommended.category, targetLevel: recommended.targetLevel } }));
      } else {
        recommendations.push({ ...recommended, progress: 0 });
      }
    }

    await prisma.user.update({ where: { id: auth.userId }, data: { targetRole } });
    const progressGaps = analysis.skills
      .filter((recommended) => {
        const existing = currentSkills.find((skill) => skill.name.toLowerCase() === recommended.name.toLowerCase());
        return !existing || existing.progress < recommended.targetLevel;
      })
      .map((skill) => skill.name);
    const updatedSkills = await prisma.skill.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ success: true, skills: updatedSkills, recommendations, gaps: Array.from(new Set([...progressGaps, ...analysis.gaps])) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message }, { status: 400 });
    console.error('Analyze career target error:', error);
    return NextResponse.json({ success: false, error: 'Unable to analyze target role' }, { status: 500 });
  }
}
