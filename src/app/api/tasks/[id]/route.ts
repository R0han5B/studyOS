import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/auth';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().nullable().optional(),
  subject: z.string().optional(),
  tags: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthenticatedUserId();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    const task = await db.task.findFirst({
      where: {
        id,
        userId: payload.userId,
      },
    });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      task: {
        ...task,
        tags: task.tags ? JSON.parse(task.tags) : [],
      },
    });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthenticatedUserId();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    const data = updateTaskSchema.parse(body);
    
    // Check if task belongs to user
    const existingTask = await db.task.findFirst({
      where: {
        id,
        userId: payload.userId,
      },
    });
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    const updateData: Record<string, unknown> = { ...data };
    
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    
    // If status is completed, set completedAt
    if (data.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completedAt = new Date();
    } else if (data.status !== 'completed') {
      updateData.completedAt = null;
    }
    
    const task = await db.task.update({
      where: { id },
      data: updateData,
    });

    if (data.status !== undefined) {
      const linkedSchedules = await db.schedule.findMany({
        where: {
          userId: payload.userId,
          scheduleData: { contains: id },
        },
      });

      await Promise.all(
        linkedSchedules.map(async (schedule) => {
          const scheduleData = schedule.scheduleData ? JSON.parse(schedule.scheduleData) : {};
          if (scheduleData.taskId !== id) {
            return;
          }

          await db.schedule.update({
            where: { id: schedule.id },
            data: {
              completed: data.status === 'completed',
            },
          });
        })
      );
    }
    
    return NextResponse.json({
      task: {
        ...task,
        tags: task.tags ? JSON.parse(task.tags) : [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthenticatedUserId();
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Check if task belongs to user
    const existingTask = await db.task.findFirst({
      where: {
        id,
        userId: payload.userId,
      },
    });
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    await db.task.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
