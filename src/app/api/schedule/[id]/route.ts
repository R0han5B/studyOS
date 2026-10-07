import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

function isObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

function parseLegacySessionId(id: string) {
  if (id.length <= 25 || id[24] !== '-') {
    return null;
  }

  const scheduleId = id.slice(0, 24);
  if (!isObjectId(scheduleId)) {
    return null;
  }

  const rest = id.slice(25);
  const date = rest.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || rest[10] !== '-') {
    return null;
  }

  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 10) {
    return null;
  }

  return {
    scheduleId,
    date,
    subject: rest.slice(11, lastDash),
    startTime: rest.slice(lastDash + 1),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = await getAuthenticatedUserId();
    if (!userPayload) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const completed = Boolean(body.completed);

    const legacySession = !isObjectId(id) ? parseLegacySessionId(id) : null;
    if (!isObjectId(id) && !legacySession) {
      return NextResponse.json({ success: false, error: 'Invalid schedule id' }, { status: 400 });
    }

    const existing = await prisma.schedule.findFirst({
      where: { id: legacySession?.scheduleId || id, userId: userPayload.userId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const scheduleData = existing.scheduleData ? JSON.parse(existing.scheduleData) : null;

    if (legacySession && Array.isArray(scheduleData?.schedule)) {
      let matchedTaskId: string | undefined;
      let foundSession = false;

      const nextScheduleData = {
        ...scheduleData,
        schedule: scheduleData.schedule.map((day: any) => {
          if (day.date !== legacySession.date) {
            return day;
          }

          return {
            ...day,
            sessions: (day.sessions || []).map((session: any) => {
              if (session.subject !== legacySession.subject || session.startTime !== legacySession.startTime) {
                return session;
              }

              foundSession = true;
              matchedTaskId = session.taskId || undefined;
              return {
                ...session,
                completed,
              };
            }),
          };
        }),
      };

      if (!foundSession) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }

      const allCompleted = nextScheduleData.schedule.every((day: any) =>
        (day.sessions || []).every((session: any) => Boolean(session.completed))
      );

      const updatedLegacySchedule = await prisma.schedule.update({
        where: { id: existing.id },
        data: {
          completed: allCompleted,
          scheduleData: JSON.stringify(nextScheduleData),
        },
      });

      if (matchedTaskId) {
        await prisma.task.update({
          where: { id: matchedTaskId },
          data: {
            status: completed ? 'completed' : 'pending',
            completedAt: completed ? new Date() : null,
          },
        }).catch(() => undefined);
      }

      return NextResponse.json({
        success: true,
        schedule: {
          ...updatedLegacySchedule,
          scheduleData: updatedLegacySchedule.scheduleData ? JSON.parse(updatedLegacySchedule.scheduleData) : null,
        },
      });
    }

    const taskId = scheduleData?.taskId as string | undefined;

    const updated = await prisma.schedule.update({
      where: { id: existing.id },
      data: { completed },
    });

    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: completed ? 'completed' : 'pending',
          completedAt: completed ? new Date() : null,
          actualMinutes: completed ? Math.round((existing.hoursPerDay || 0) * 60) : null,
        },
      }).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      schedule: {
        ...updated,
        scheduleData: updated.scheduleData ? JSON.parse(updated.scheduleData) : null,
      },
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
