import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/tasks - Get all tasks for the current user
export async function GET(request: Request) {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const subject = searchParams.get('subject');

    // Build filter
    const where: any = { userId: userPayload.userId };
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (subject && subject !== 'all') where.subject = subject;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      tasks: tasks.map(task => ({
        ...task,
        tags: task.tags ? JSON.parse(task.tags) : [],
      })),
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  try {
    const userPayload = await getAuthenticatedUserId();

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      priority = 'medium',
      dueDate,
      subject,
      tags = [],
      estimatedMinutes,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get the max order for the user's tasks
    const maxOrder = await prisma.task.aggregate({
      where: { userId: userPayload.userId },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        subject,
        tags: JSON.stringify(tags),
        estimatedMinutes,
        order: (maxOrder._max.order || 0) + 1,
        userId: userPayload.userId,
      },
    });

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        tags: JSON.parse(task.tags || '[]'),
      },
      message: 'Task created successfully',
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
