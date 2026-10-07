'use client';

import { motion } from 'framer-motion';
import { Plus, Clock, BookOpen, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickActionsProps {
  onNewTask: () => void;
  onStartPomodoro: () => void;
  onLogStudy: () => void;
  onSetGoal: () => void;
}

export function QuickActions({ onNewTask, onStartPomodoro, onLogStudy, onSetGoal }: QuickActionsProps) {
  const actions = [
    { icon: Plus, label: 'New Task', color: 'bg-violet-500 hover:bg-violet-600', onClick: onNewTask },
    { icon: Clock, label: 'Start Pomodoro', color: 'bg-blue-500 hover:bg-blue-600', onClick: onStartPomodoro },
    { icon: BookOpen, label: 'Log Study', color: 'bg-emerald-500 hover:bg-emerald-600', onClick: onLogStudy },
    { icon: Target, label: 'Set Goal', color: 'bg-amber-500 hover:bg-amber-600', onClick: onSetGoal },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                onClick={action.onClick}
                className={`w-full ${action.color} text-white`}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
