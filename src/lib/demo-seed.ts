import { prisma } from './db';

export const DEMO_EMAIL = 'demo@studyos.app';

export async function seedDemoUser() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: 'Demo Learner', role: 'user', targetRole: 'Full Stack Developer', careerGoal: 'Build and ship a production-ready portfolio project' },
    create: { email: DEMO_EMAIL, name: 'Demo Learner', role: 'user', targetRole: 'Full Stack Developer', careerGoal: 'Build and ship a production-ready portfolio project' },
  });

  await Promise.all([
    prisma.task.deleteMany({ where: { userId: user.id } }),
    prisma.studySession.deleteMany({ where: { userId: user.id } }),
    prisma.productivityLog.deleteMany({ where: { userId: user.id } }),
    prisma.skill.deleteMany({ where: { userId: user.id } }),
    prisma.schedule.deleteMany({ where: { userId: user.id } }),
    prisma.focusSession.deleteMany({ where: { userId: user.id } }),
  ]);

  const now = new Date();
  const day = (offset: number, hour = 9) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  await Promise.all([
    prisma.task.createMany({ data: [
      { title: 'Build REST API authentication', description: 'Add JWT refresh-token rotation to the portfolio API.', subject: 'Backend', status: 'in_progress', priority: 'high', dueDate: day(2), estimatedMinutes: 90, tags: JSON.stringify(['career', 'project']), userId: user.id },
      { title: 'Review React Server Components', subject: 'React', status: 'completed', priority: 'medium', dueDate: day(-1), completedAt: day(-1), estimatedMinutes: 45, actualMinutes: 50, tags: JSON.stringify(['study']), userId: user.id },
      { title: 'Write integration tests', subject: 'Testing', status: 'pending', priority: 'medium', dueDate: day(4), estimatedMinutes: 60, tags: JSON.stringify(['career']), userId: user.id },
      { title: 'Prepare system design notes', subject: 'System Design', status: 'pending', priority: 'urgent', dueDate: day(6), estimatedMinutes: 75, tags: JSON.stringify(['exam', 'career']), userId: user.id },
    ] }),
    prisma.studySession.createMany({ data: [
      { subject: 'JavaScript', topic: 'Async patterns', startTime: day(-2), endTime: new Date(day(-2).getTime() + 50 * 60000), duration: 50, focusScore: 88, productivity: 90, userId: user.id },
      { subject: 'React', topic: 'Performance optimization', startTime: day(-1), endTime: new Date(day(-1).getTime() + 45 * 60000), duration: 45, focusScore: 82, productivity: 85, userId: user.id },
      { subject: 'Node.js', topic: 'REST API design', startTime: day(0), endTime: new Date(day(0, 17).getTime() + 30 * 60000), duration: 30, focusScore: 76, productivity: 78, userId: user.id },
    ] }),
    prisma.productivityLog.createMany({ data: [-6, -5, -4, -3, -2, -1, 0].map((offset, index) => ({ date: day(offset), studyHours: [2.1, 2.8, 1.5, 3.2, 2.6, 3.8, 1.2][index], tasksCompleted: [2, 3, 1, 4, 3, 5, 1][index], focusScore: [72, 78, 65, 84, 81, 89, 76][index], pomodoroSessions: [3, 4, 2, 5, 4, 6, 2][index], userId: user.id })) }),
    prisma.skill.createMany({ data: [
      { name: 'JavaScript', category: 'Frontend', level: 70, progress: 70, targetLevel: 100, userId: user.id },
      { name: 'React', category: 'Frontend', level: 60, progress: 60, targetLevel: 100, userId: user.id },
      { name: 'Node.js', category: 'Backend', level: 40, progress: 40, targetLevel: 100, userId: user.id },
      { name: 'MongoDB', category: 'Backend', level: 50, progress: 50, targetLevel: 100, userId: user.id },
    ] }),
    prisma.schedule.createMany({ data: [
      { title: 'REST API fundamentals', subject: 'Backend', startDate: day(1, 18), endDate: day(1, 19), hoursPerDay: 1, difficulty: 'medium', priority: 'high', scheduleData: JSON.stringify({ type: 'planner-session', startTime: '18:00', endTime: '19:00' }), aiGenerated: true, userId: user.id },
      { title: 'Testing roadmap', subject: 'Testing', startDate: day(3, 19), endDate: day(3, 20), hoursPerDay: 1, difficulty: 'medium', priority: 'medium', scheduleData: JSON.stringify({ type: 'planner-session', startTime: '19:00', endTime: '20:00' }), aiGenerated: true, userId: user.id },
      { title: 'System design practice', subject: 'System Design', startDate: day(5, 17), endDate: day(5, 18), hoursPerDay: 1, difficulty: 'hard', priority: 'high', scheduleData: JSON.stringify({ type: 'planner-session', startTime: '17:00', endTime: '18:00' }), aiGenerated: true, userId: user.id },
    ] }),
  ]);

  return user;
}
