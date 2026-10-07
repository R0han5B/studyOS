import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

const updateSchema = z.object({
  level: z.number().int().min(0).max(100).optional(),
  progress: z.number().min(0).max(100).optional(),
  targetLevel: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const data = updateSchema.parse(await request.json());
    const existing = await prisma.skill.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 });
    const skill = await prisma.skill.update({ where: { id }, data: { ...data, ...(data.level !== undefined && data.progress === undefined ? { progress: data.level } : {}) } });
    return NextResponse.json({ success: true, skill });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message }, { status: 400 });
    console.error('Update skill error:', error);
    return NextResponse.json({ success: false, error: 'Unable to update skill' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const result = await prisma.skill.deleteMany({ where: { id, userId: auth.userId } });
  if (!result.count) return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
