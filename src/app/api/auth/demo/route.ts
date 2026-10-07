import { NextResponse } from 'next/server';
import { seedDemoUser } from '@/lib/demo-seed';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';

export async function POST() {
  try {
    const user = await seedDemoUser();
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    const { prisma } = await import('@/lib/db');
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role },
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ success: false, error: 'Unable to start the demo. Check your database connection.' }, { status: 500 });
  }
}
