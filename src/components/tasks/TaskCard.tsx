'use client';

import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Tag, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { Task } from '@/store/useStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
}

const priorityColors = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

export function TaskCard({ task, onEdit, onDelete, onToggleStatus }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  
  const StatusIcon = statusIcons[task.status];
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(isDragging && 'opacity-50')}
    >
      <Card className="p-4 hover:shadow-md transition-shadow group">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
          {/* Status Toggle */}
          <button
            onClick={() => {
              const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
              onToggleStatus(task.id, nextStatus);
            }}
            className="mt-0.5"
          >
            <StatusIcon
              className={cn(
                'w-5 h-5',
                task.status === 'completed' ? 'text-emerald-500' : 'text-slate-400 hover:text-violet-500'
              )}
            />
          </button>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'font-medium text-slate-900 dark:text-white',
                task.status === 'completed' && 'line-through text-slate-400 dark:text-slate-500'
              )}
            >
              {task.title}
            </h4>
            
            {task.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            
            {/* Tags and Meta */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge className={priorityColors[task.priority]} variant="secondary">
                {task.priority}
              </Badge>
              
              {task.subject && (
                <Badge variant="outline" className="text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-800">
                  <Tag className="w-3 h-3 mr-1" />
                  {task.subject}
                </Badge>
              )}
              
              {task.dueDate && (
                <Badge
                  variant="outline"
                  className={cn(
                    isOverdue && 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800'
                  )}
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDueDate(task.dueDate)}
                  {isOverdue && <AlertCircle className="w-3 h-3 ml-1" />}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onDelete(task.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
