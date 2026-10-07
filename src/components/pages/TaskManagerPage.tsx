"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, CheckCircle2, Clock, Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, Task } from '@/store/useStore';
import { tasksApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TaskManagerPage() {
  const { tasks, setTasks, addTask: addTaskToStore, updateTask, deleteTask: deleteTaskFromStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultNewTask: {
    title: string;
    description: string;
    priority: Task['priority'];
    subject: string;
    dueDate: string;
  } = {
    title: '',
    description: '',
    priority: 'medium',
    subject: '',
    dueDate: '',
  };
  const [newTask, setNewTask] = useState({
    ...defaultNewTask,
  });

  useEffect(() => {
    const loadTasks = async () => {
      const response = await tasksApi.getAll();
      const payload = response as typeof response & { tasks?: Task[]; task?: Task };
      if (response.success && payload.tasks) {
        setTasks(payload.tasks);
      }
    };

    loadTasks().catch(() => undefined);
  }, [setTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (activeFilter !== 'all' && task.status !== activeFilter) return false;
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.subject?.toLowerCase().includes(query) ||
        task.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [activeFilter, searchQuery, tasks]);

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  };

  const toggleTaskComplete = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(task.id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
    });

    const response = await tasksApi.update(task.id, {
      status: nextStatus,
    });
    const payload = response as typeof response & { task?: Task };

    if (!response.success || !payload.task) {
      updateTask(task.id, {
        status: task.status,
        completedAt: task.completedAt,
      });
      return;
    }

    updateTask(task.id, payload.task);
  };

  const deleteTask = async (id: string) => {
    const existing = tasks.find((task) => task.id === id);
    deleteTaskFromStore(id);

    const response = await tasksApi.delete(id);
    if (!response.success && existing) {
      addTaskToStore(existing);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    const response = await tasksApi.create({
      title: newTask.title.trim(),
      description: newTask.description || undefined,
      priority: newTask.priority,
      subject: newTask.subject || undefined,
      dueDate: newTask.dueDate || undefined,
    });
    setIsSubmitting(false);
    const payload = response as typeof response & { task?: Task };

    if (!response.success || !payload.task) {
      return;
    }

    addTaskToStore(payload.task);
    setNewTask(defaultNewTask);
    setIsAddDialogOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Task Manager</h2>
          <p className="text-muted-foreground">
            {taskStats.completed} of {taskStats.total} tasks completed
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a task for the current user. Study-session tasks from the planner will also appear here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Task title..."
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Task description..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: Task['priority']) => setNewTask({ ...newTask, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="Subject..."
                    value={newTask.subject}
                    onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <Button onClick={addTask} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: taskStats.total, color: 'text-foreground' },
          { label: 'Pending', count: taskStats.pending, color: 'text-amber-500' },
          { label: 'In Progress', count: taskStats.inProgress, color: 'text-blue-500' },
          { label: 'Completed', count: taskStats.completed, color: 'text-emerald-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'default' : 'outline'}
              onClick={() => setActiveFilter(filter)}
              className="capitalize"
            >
              {filter === 'in_progress' ? 'In Progress' : filter}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No tasks found</p>
            <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
              Add your first task
            </Button>
          </motion.div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            const isMissedSession = isOverdue && task.tags.includes('study-session');

            return (
              <Card key={task.id} className={cn(task.status === 'completed' && 'opacity-70')}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTaskComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className={cn('font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {task.subject && <Badge variant="secondary">{task.subject}</Badge>}
                      <Badge variant="outline">{task.priority}</Badge>
                      {task.dueDate && (
                        <Badge variant="outline" className={cn(isOverdue && 'border-rose-500 text-rose-500')}>
                          {isOverdue ? <AlertCircle className="w-3 h-3 mr-1" /> : <Calendar className="w-3 h-3 mr-1" />}
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                      {isMissedSession && <Badge variant="destructive">Missed Session</Badge>}
                      {task.estimatedMinutes && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.estimatedMinutes} min
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
