"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Sparkles, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const { user, tasks, setCurrentPage } = useStore();

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const pendingTasks = tasks.filter((task) => task.status !== 'completed').length;
  const overdueTasks = tasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
  ).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const estimatedHours = Math.round(tasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0) / 60);
  const upcomingTasks = tasks
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);

  const stats = [
    {
      title: 'Total Tasks',
      value: tasks.length.toString(),
      change: tasks.length === 0 ? 'No data yet' : `${pendingTasks} active`,
      icon: CheckCircle2,
      accent: true,
    },
    {
      title: 'Completed',
      value: completedTasks.toString(),
      change: `${completionRate}% done`,
      icon: Target,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Upcoming',
      value: upcomingTasks.length.toString(),
      change: overdueTasks > 0 ? `${overdueTasks} overdue` : 'Nothing overdue',
      icon: Calendar,
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Planned Time',
      value: `${estimatedHours}h`,
      change: 'Across all tasks',
      icon: Clock,
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  const recommendations = tasks.length === 0
    ? [
        {
          title: 'Create Your First Task',
          description: 'Start with one concrete task so the app can begin tracking real progress.',
          action: 'Open Tasks',
          onClick: () => setCurrentPage('tasks'),
        },
        {
          title: 'Plan One Study Block',
          description: 'A short scheduled session is enough to make the planner useful immediately.',
          action: 'Open Planner',
          onClick: () => setCurrentPage('planner'),
        },
        {
          title: 'Configure AI Later',
          description: 'Once `.env` contains your OpenRouter key and model, the AI features will start working.',
          action: 'Open Settings',
          onClick: () => setCurrentPage('settings'),
        },
      ]
    : [
        {
          title: 'Finish High-Priority Work',
          description: `You have ${tasks.filter((task) => task.priority === 'high' || task.priority === 'urgent').length} high-priority task(s).`,
          action: 'Review Tasks',
          onClick: () => setCurrentPage('tasks'),
        },
        {
          title: 'Close Open Items',
          description: `${pendingTasks} task(s) are still active. Completing one today will improve momentum.`,
          action: 'Complete One Task',
          onClick: () => setCurrentPage('tasks'),
        },
        {
          title: 'Protect Your Schedule',
          description: 'Keep upcoming work realistic so your dashboard reflects what you can actually finish.',
          action: 'Adjust Plan',
          onClick: () => setCurrentPage('planner'),
        },
      ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card
          className="border"
          style={{
            background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent-50) 85%, transparent), color-mix(in oklab, var(--accent-100) 75%, transparent), color-mix(in oklab, var(--accent-200) 65%, transparent))',
            borderColor: 'color-mix(in oklab, var(--accent-300) 60%, transparent)',
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  Good {getTimeOfDay()}, {user?.name?.split(' ')[0] || 'Student'}!
                </h2>
                <p className="text-muted-foreground">
                  {tasks.length === 0
                    ? 'Your dashboard is intentionally blank for a new account. Add your first task or schedule to get started.'
                    : `You have ${pendingTasks} active task${pendingTasks === 1 ? '' : 's'} and ${completedTasks} completed.`}
                </p>
                <div className="flex gap-3 mt-4">
                  <Button onClick={() => setCurrentPage('planner')} className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Plan Today
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentPage('tasks')} className="gap-2">
                    <Zap className="w-4 h-4" />
                    Manage Tasks
                  </Button>
                </div>
              </div>
              <div className="hidden md:block">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
                >
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <Badge variant="secondary" className="text-xs">
                        {stat.change}
                      </Badge>
                    </div>
                    <div
                      className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-lg', !stat.accent && stat.color)}
                      style={stat.accent ? { background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' } : undefined}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>Next items on your list</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage('tasks')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No tasks yet. Add your first task to populate the dashboard.
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border transition-colors"
                      style={{ borderColor: 'color-mix(in oklab, var(--border) 85%, transparent)' }}
                    >
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          task.priority === 'urgent' && 'bg-rose-600',
                          task.priority === 'high' && 'bg-rose-500',
                          task.priority === 'medium' && 'bg-amber-500',
                          task.priority === 'low' && 'bg-emerald-500'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card
            className="border"
            style={{
              background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent-50) 65%, transparent), color-mix(in oklab, var(--accent-100) 55%, transparent))',
              borderColor: 'color-mix(in oklab, var(--accent-300) 55%, transparent)',
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-500" />
                <CardTitle>Suggested Next Steps</CardTitle>
              </div>
              <CardDescription>Lightweight guidance based on your current workspace data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={rec.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-background border border-border"
                  >
                    <h4 className="font-medium mb-2">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={rec.onClick}>
                      {rec.action}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
