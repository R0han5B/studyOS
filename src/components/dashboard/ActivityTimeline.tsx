'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, BookOpen, Trophy, Flame, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'task_completed' | 'study_session' | 'pomodoro' | 'achievement' | 'streak' | 'goal';
  title: string;
  description: string;
  timestamp: Date;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const activityIcons = {
  task_completed: CheckCircle2,
  study_session: BookOpen,
  pomodoro: Clock,
  achievement: Trophy,
  streak: Flame,
  goal: Target,
};

const activityColors = {
  task_completed: 'text-emerald-500 bg-emerald-500/10',
  study_session: 'text-violet-500 bg-violet-500/10',
  pomodoro: 'text-blue-500 bg-blue-500/10',
  achievement: 'text-amber-500 bg-amber-500/10',
  streak: 'text-rose-500 bg-rose-500/10',
  goal: 'text-indigo-500 bg-indigo-500/10',
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          <div className="space-y-1">
            {activities.map((activity, index) => {
              const Icon = activityIcons[activity.type];
              const colorClass = activityColors[activity.type];
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex items-start gap-4 py-4"
                >
                  {/* Timeline line */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                  )}
                  
                  {/* Icon */}
                  <div className={cn('relative z-10 p-2 rounded-full', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {formatTime(new Date(activity.timestamp))}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            
            {activities.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No recent activity
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
