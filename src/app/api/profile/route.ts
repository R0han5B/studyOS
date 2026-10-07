import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clearAuthCookies, getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  notificationPrefs: z
    .object({
      emailStudyReminders: z.boolean().optional(),
      emailWeeklyReport: z.boolean().optional(),
      pushTaskReminders: z.boolean().optional(),
      pushAchievements: z.boolean().optional(),
      soundEffects: z.boolean().optional(),
    })
    .optional(),
});

function parseNotificationPrefs(value: string | null | undefined) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timezone: true,
        theme: true,
        notificationPrefs: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        notificationPrefs: parseNotificationPrefs(user.notificationPrefs),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: userPayload.userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.notificationPrefs !== undefined
          ? { notificationPrefs: JSON.stringify(data.notificationPrefs) }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timezone: true,
        theme: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        notificationPrefs: parseNotificationPrefs(updatedUser.notificationPrefs),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Invalid profile data' },
        { status: 400 }
      );
    }

    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await prisma.$transaction([
      prisma.focusSession.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.resumeProfile.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.productivityLog.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.studySession.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.skill.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.schedule.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.task.deleteMany({ where: { userId: userPayload.userId } }),
      prisma.user.delete({ where: { id: userPayload.userId } }),
    ]);

    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
