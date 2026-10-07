import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

const skillSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().max(80).optional(),
  level: z.number().int().min(0).max(100).optional(),
  targetLevel: z.number().int().min(1).max(100).optional(),
});

export async function GET() {
  const auth = await getAuthenticatedUserId();
  if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const skills = await prisma.skill.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ success: true, skills });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const data = skillSchema.parse(await request.json());
    const skill = await prisma.skill.create({
      data: { ...data, progress: data.level ?? 0, userId: auth.userId },
    });
    return NextResponse.json({ success: true, skill }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message }, { status: 400 });
    console.error('Create skill error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create skill' }, { status: 500 });
  }
}
