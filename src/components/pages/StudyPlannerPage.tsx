"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, Task } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ScheduleEvent {
  id: string;
  title: string;
  subject: string;
  date: Date;
  startTime: string;
  endTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  aiGenerated: boolean;
  taskId?: string | null;
  isLegacy?: boolean;
}

const defaultSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science', 'Economics', 'Psychology', 'Art'];

export function StudyPlannerPage() {
  const { setTasks } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const allSubjects = [...defaultSubjects, ...customSubjects];

  const [newEvent, setNewEvent] = useState<{
    title: string;
    subject: string;
    customSubject: string;
    startTime: string;
    endTime: string;
    difficulty: 'easy' | 'medium' | 'hard';
    priority: 'low' | 'medium' | 'high';
  }>({
    title: '',
    subject: '',
    customSubject: '',
    startTime: '09:00',
    endTime: '10:00',
    difficulty: 'medium' as const,
    priority: 'medium' as const,
  });

  const [aiScheduleForm, setAiScheduleForm] = useState({
    subjects: [] as string[],
    newSubject: '',
    customSubject: '',
    dailyHours: '4',
    examDate: '',
    startTime: '09:00',
    addToTasks: true,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const loadPlannerEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/schedule', { cache: 'no-store' });
      const result = await response.json().catch(() => ({ success: false, schedules: [] }));

      if (!result.success) {
        setEvents([]);
        return;
      }

      const mappedEvents: ScheduleEvent[] = [];
      const discoveredSubjects = new Set<string>();

      for (const schedule of result.schedules || []) {
        const scheduleData = schedule.scheduleData || {};

        if (scheduleData.type === 'planner-session') {
          mappedEvents.push({
            id: schedule.id,
            title: schedule.title,
            subject: schedule.subject,
            date: new Date(schedule.startDate),
            startTime: scheduleData.startTime || format(new Date(schedule.startDate), 'HH:mm'),
            endTime: scheduleData.endTime || format(new Date(schedule.endDate), 'HH:mm'),
            difficulty: (scheduleData.difficulty || schedule.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
            priority: (scheduleData.priority || schedule.priority || 'medium') as 'low' | 'medium' | 'high',
            completed: Boolean(schedule.completed),
            aiGenerated: Boolean(schedule.aiGenerated),
            taskId: scheduleData.taskId || null,
          });
          discoveredSubjects.add(schedule.subject);
          continue;
        }

        if (Array.isArray(scheduleData.schedule)) {
          for (const day of scheduleData.schedule) {
            for (const session of day.sessions || []) {
              mappedEvents.push({
                id: `${schedule.id}-${day.date}-${session.subject}-${session.startTime}`,
                title: session.focus || `${session.subject} Study Session`,
                subject: session.subject,
                date: new Date(day.date),
                startTime: session.startTime,
                endTime: session.endTime,
                difficulty: (session.difficulty || schedule.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
                priority: (session.priority || schedule.priority || 'medium') as 'low' | 'medium' | 'high',
                completed: Boolean(session.completed),
                aiGenerated: true,
                taskId: session.taskId || null,
                isLegacy: true,
              });
              discoveredSubjects.add(session.subject);
            }
          }
        }
      }

      setCustomSubjects(Array.from(discoveredSubjects).filter((subject) => !defaultSubjects.includes(subject)));
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Failed to load planner events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTasks = async () => {
    const tasksResponse = await fetch('/api/tasks', { cache: 'no-store' });
    const taskData = await tasksResponse.json().catch(() => ({ success: false, tasks: [] }));
    if (taskData.success && taskData.tasks) {
      setTasks(taskData.tasks as Task[]);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPlannerEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getEventsForDate = (date: Date) => events.filter((event) => isSameDay(event.date, date));
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const addCustomSubjectToAIForm = () => {
    const subject = aiScheduleForm.customSubject.trim();
    if (!subject) return;

    if (!allSubjects.includes(subject)) {
      setCustomSubjects((prev) => [...prev, subject]);
    }

    if (!aiScheduleForm.subjects.includes(subject)) {
      setAiScheduleForm((prev) => ({
        ...prev,
        subjects: [...prev.subjects, subject],
        customSubject: '',
      }));
    }
  };

  const addSubjectToAIForm = (subject: string) => {
    if (subject && !aiScheduleForm.subjects.includes(subject)) {
      setAiScheduleForm((prev) => ({
        ...prev,
        subjects: [...prev.subjects, subject],
        newSubject: '',
      }));
    }
  };

  const removeSubjectFromAIForm = (subject: string) => {
    setAiScheduleForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((item) => item !== subject),
    }));
  };

  const generateAISchedule = async () => {
    if (aiScheduleForm.subjects.length === 0) {
      window.alert('Please add at least one subject');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: aiScheduleForm.subjects,
          dailyHours: parseInt(aiScheduleForm.dailyHours, 10),
          examDate: aiScheduleForm.examDate || null,
          startTime: aiScheduleForm.startTime,
          addToTasks: aiScheduleForm.addToTasks,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate schedule');
      }

      await loadPlannerEvents();
      if (aiScheduleForm.addToTasks) {
        await refreshTasks();
      }

      setShowAIDialog(false);
      setAiScheduleForm({
        subjects: [],
        newSubject: '',
        customSubject: '',
        dailyHours: '4',
        examDate: '',
        startTime: '09:00',
        addToTasks: true,
      });
    } catch (error) {
      console.error('Error generating AI schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addEvent = async () => {
    const subject = newEvent.customSubject.trim() || newEvent.subject;
    if (!newEvent.title || !subject || !selectedDate) return;

    if (newEvent.customSubject.trim() && !allSubjects.includes(newEvent.customSubject.trim())) {
      setCustomSubjects((prev) => [...prev, newEvent.customSubject.trim()]);
    }

    const response = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newEvent.title,
        subject,
        date: selectedDate.toISOString(),
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        difficulty: newEvent.difficulty,
        priority: newEvent.priority,
        addToTasks: true,
      }),
    });

    const result = await response.json().catch(() => ({ success: false }));
    if (!result.success) {
      return;
    }

    await loadPlannerEvents();
    await refreshTasks();

    setNewEvent({
      title: '',
      subject: '',
      customSubject: '',
      startTime: '09:00',
      endTime: '10:00',
      difficulty: 'medium',
      priority: 'medium',
    });
    setShowAddDialog(false);
  };

  const toggleEventComplete = async (id: string, completed: boolean) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === id ? { ...event, completed } : event))
    );

    const response = await fetch(`/api/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });

    const result = await response.json().catch(() => ({ success: false }));
    if (!result.success) {
      setEvents((prev) =>
        prev.map((event) => (event.id === id ? { ...event, completed: !completed } : event))
      );
      return;
    }

    await loadPlannerEvents();
    await refreshTasks();
  };

  const totalStudyHours = useMemo(() => {
    return events.reduce((acc, event) => {
      const [startHour, startMinute] = event.startTime.split(':').map(Number);
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      const duration = (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
      return acc + Math.max(duration, 0.5);
    }, 0);
  }, [events]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Study Planner</h2>
          <p className="text-muted-foreground">Plan and schedule your study sessions with AI assistance</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Generate AI Schedule
                </DialogTitle>
                <DialogDescription>
                  Build a schedule before the exam and optionally add each session directly to tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Add Subjects to Study</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs text-muted-foreground w-full">Quick add:</span>
                    {allSubjects.filter((subject) => !aiScheduleForm.subjects.includes(subject)).slice(0, 6).map((subject) => (
                      <Button key={subject} variant="outline" size="sm" onClick={() => addSubjectToAIForm(subject)} className="h-7 text-xs">
                        + {subject}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Or type a custom subject..."
                      value={aiScheduleForm.customSubject}
                      onChange={(e) => setAiScheduleForm((prev) => ({ ...prev, customSubject: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomSubjectToAIForm();
                        }
                      }}
                    />
                    <Button type="button" onClick={addCustomSubjectToAIForm}>
                      Add
                    </Button>
                  </div>
                  {aiScheduleForm.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs text-muted-foreground w-full">Selected subjects:</span>
                      {aiScheduleForm.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary" className="gap-1 py-1.5">
                          {subject}
                          <button onClick={() => removeSubjectFromAIForm(subject)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hours per Day</Label>
                    <Select value={aiScheduleForm.dailyHours} onValueChange={(value) => setAiScheduleForm((prev) => ({ ...prev, dailyHours: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={aiScheduleForm.startTime}
                      onChange={(e) => setAiScheduleForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Exam Date</Label>
                  <Input
                    type="date"
                    value={aiScheduleForm.examDate}
                    onChange={(e) => setAiScheduleForm((prev) => ({ ...prev, examDate: e.target.value }))}
                  />
                </div>

                <label className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Add generated sessions to tasks</p>
                    <p className="text-xs text-muted-foreground">Pending sessions will show up as missed if their time passes unfinished.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiScheduleForm.addToTasks}
                    onChange={(e) => setAiScheduleForm((prev) => ({ ...prev, addToTasks: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </label>

                <Button className="w-full" onClick={generateAISchedule} disabled={isGenerating || aiScheduleForm.subjects.length === 0 || !aiScheduleForm.examDate}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Schedule
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Study Session</DialogTitle>
                <DialogDescription>
                  Schedule a new study session for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Study session title..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={newEvent.subject} onValueChange={(value) => setNewEvent({ ...newEvent, subject: value, customSubject: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSubjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or type a custom subject..."
                    value={newEvent.customSubject}
                    onChange={(e) => setNewEvent({ ...newEvent, customSubject: e.target.value, subject: '' })}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={newEvent.difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setNewEvent({ ...newEvent, difficulty: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newEvent.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewEvent({ ...newEvent, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addEvent} className="w-full">
                  Add Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Hours Planned', value: `${totalStudyHours.toFixed(1)}h`, icon: Clock, color: 'text-violet-500' },
          { label: 'Sessions Scheduled', value: events.length.toString(), icon: CalendarIcon, color: 'text-blue-500' },
          { label: 'AI Generated', value: events.filter((event) => event.aiGenerated).length.toString(), icon: Sparkles, color: 'text-amber-500' },
          { label: 'Completed', value: events.filter((event) => event.completed).length.toString(), icon: CheckCircle, color: 'text-emerald-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg bg-muted flex items-center justify-center', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="p-2 aspect-square" />
              ))}

              {days.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const hasEvents = dayEvents.length > 0;

                return (
                  <motion.button
                    key={day.toISOString()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'p-2 aspect-square rounded-lg text-sm relative transition-colors',
                      'hover:bg-muted',
                      isSelected && 'text-white',
                      isToday(day) && !isSelected && 'ring-2 ring-accent-500',
                      !isSameMonth(day, currentDate) && 'text-muted-foreground opacity-50'
                    )}
                    style={
                      isSelected
                        ? { background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }
                        : undefined
                    }
                  >
                    <span>{format(day, 'd')}</span>
                    {hasEvents && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <div
                            key={`${event.id}-${index}`}
                            className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-accent-500')}
                            title={event.subject}
                          />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}</CardTitle>
            <CardDescription>{selectedDateEvents.length} sessions scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading sessions...</p>
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions scheduled</p>
                  <Button variant="link" size="sm" onClick={() => setShowAddDialog(true)}>
                    Add a session
                  </Button>
                </div>
              ) : (
                selectedDateEvents.map((event) => {
                  const isMissed = !event.completed && event.date < new Date();
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('p-4 rounded-lg border border-border', 'hover:shadow-md transition-shadow', event.completed && 'opacity-60')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {event.aiGenerated && <Sparkles className="w-4 h-4 text-amber-500" />}
                          <h4 className={cn('font-medium', event.completed && 'line-through')}>{event.title}</h4>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleEventComplete(event.id, !event.completed)}>
                          {event.completed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {event.subject}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.priority}
                        </Badge>
                        {event.isLegacy && (
                          <Badge variant="outline" className="text-xs">
                            Saved plan
                          </Badge>
                        )}
                        {isMissed && (
                          <Badge variant="destructive" className="text-xs">
                            Missed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {event.startTime} - {event.endTime}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
