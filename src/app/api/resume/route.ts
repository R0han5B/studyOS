import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAIResponse } from '@/lib/ai-service';

const resumeSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().default(''),
  location: z.string().trim().max(120).optional().default(''),
  targetRole: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(1000).optional().default(''),
  experience: z.string().trim().max(5000).optional().default(''),
  education: z.string().trim().max(3000).optional().default(''),
  projects: z.string().trim().max(5000).optional().default(''),
  skills: z.string().trim().max(2000).optional().default(''),
});

function parse(value: string | null | undefined) {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
}

export async function GET() {
  const auth = await getAuthenticatedUserId();
  if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  const profile = await prisma.resumeProfile.findUnique({ where: { userId: auth.userId } });
  return NextResponse.json({ success: true, profile: profile ? { ...profile, experience: parse(profile.experience), education: parse(profile.education), projects: parse(profile.projects), skills: parse(profile.skills) } : null });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const data = resumeSchema.parse(await request.json());
    const userSkills = await prisma.skill.findMany({ where: { userId: auth.userId }, select: { name: true, progress: true } });
    const prompt = `Create an ATS-friendly resume for ${data.targetRole}. Return plain text only with clear sections: SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION. Use the supplied facts and do not invent employers, dates, metrics, or degrees.
Name: ${data.fullName}
Phone: ${data.phone}
Location: ${data.location}
Target role: ${data.targetRole}
Summary: ${data.summary}
Experience: ${data.experience}
Education: ${data.education}
Projects: ${data.projects}
Skills: ${data.skills || userSkills.map((skill) => skill.name).join(', ')}`;

    let resumeText = `${data.fullName}\n${data.targetRole}\n${data.location}${data.phone ? ` | ${data.phone}` : ''}\n\nSUMMARY\n${data.summary}\n\nSKILLS\n${data.skills || userSkills.map((skill) => skill.name).join(', ')}\n\nEXPERIENCE\n${data.experience}\n\nPROJECTS\n${data.projects}\n\nEDUCATION\n${data.education}`;
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL) {
      try { resumeText = await generateAIResponse(prompt, 'You are an expert ATS resume writer. Be accurate, concise, and never fabricate facts.'); } catch (error) { console.warn('Resume AI unavailable; using structured ATS fallback:', error instanceof Error ? error.message : error); }
    }

    const profile = await prisma.resumeProfile.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...data, experience: JSON.stringify(data.experience.split('\n').filter(Boolean)), education: JSON.stringify(data.education.split('\n').filter(Boolean)), projects: JSON.stringify(data.projects.split('\n').filter(Boolean)), skills: JSON.stringify((data.skills || userSkills.map((skill) => skill.name).join(', ')).split(',').map((item) => item.trim()).filter(Boolean)), resumeText },
      update: { ...data, experience: JSON.stringify(data.experience.split('\n').filter(Boolean)), education: JSON.stringify(data.education.split('\n').filter(Boolean)), projects: JSON.stringify(data.projects.split('\n').filter(Boolean)), skills: JSON.stringify((data.skills || userSkills.map((skill) => skill.name).join(', ')).split(',').map((item) => item.trim()).filter(Boolean)), resumeText },
    });
    return NextResponse.json({ success: true, resumeText, profile });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message }, { status: 400 });
    console.error('Generate resume error:', error);
    return NextResponse.json({ success: false, error: 'Unable to generate resume' }, { status: 500 });
  }
}
