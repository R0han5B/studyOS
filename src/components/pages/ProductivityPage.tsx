"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Target,
  CheckCircle,
  Flame,
  BarChart3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductivityLog {
  id: string;
  date: string;
  studyHours: number;
  tasksCompleted: number;
  focusScore: number;
  pomodoroSessions: number;
}

interface StudySession {
  id: string;
  subject: string;
  topic: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  focusScore: number | null;
}

interface ProductivityResponse {
  success: boolean;
  stats?: {
    totalStudyHours: number;
    totalTasksCompleted: number;
    avgFocusScore: number;
    totalPomodoroSessions: number;
    totalSessions: number;
    period: string;
  };
  logs?: ProductivityLog[];
  sessions?: StudySession[];
}

interface HeatmapRow {
  day: string;
  hours: number[];
}

interface PlannedSession {
  id: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  duration: number;
  completed: boolean;
  taskId: string | null;
  date: string;
}

export function ProductivityPage() {
  const { pomodoroSettings, tasks, setTasks } = useStore();
  const [timerType, setTimerType] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [logs, setLogs] = useState<ProductivityLog[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [selectedPlannedSession, setSelectedPlannedSession] = useState<PlannedSession | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentTask = useMemo(() => {
    if (selectedPlannedSession) {
      return `${selectedPlannedSession.subject} - ${selectedPlannedSession.title}`;
    }

    const activeTask = tasks.find((task) => task.status === 'in_progress') || tasks.find((task) => task.status === 'pending');
    if (!activeTask) return '';

    return activeTask.subject ? `${activeTask.subject}${activeTask.title ? ` - ${activeTask.title}` : ''}` : activeTask.title;
  }, [selectedPlannedSession, tasks]);

  const currentSubject = useMemo(() => {
    if (!currentTask) return 'General Study';
    return currentTask.split(' - ')[0] || 'General Study';
  }, [currentTask]);

  const timerSettings = useMemo(
    () => ({
      work: pomodoroSettings.focusDuration * 60,
      shortBreak: pomodoroSettings.shortBreak * 60,
      longBreak: pomodoroSettings.longBreak * 60,
    }),
    [pomodoroSettings.focusDuration, pomodoroSettings.shortBreak, pomodoroSettings.longBreak]
  );
  const selectedSessionDurationSeconds = selectedPlannedSession
    ? Math.round(selectedPlannedSession.duration * 60)
    : timerSettings.work;

  const [timeLeft, setTimeLeft] = useState(pomodoroSettings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);

  const loadProductivity = async () => {
    try {
      const [response, scheduleResponse, tasksResponse] = await Promise.all([
        fetch('/api/productivity?period=week', { cache: 'no-store' }),
        fetch('/api/schedule', { cache: 'no-store' }),
        fetch('/api/tasks', { cache: 'no-store' }),
      ]);
      const result: ProductivityResponse = await response.json().catch(() => ({ success: false }));
      const scheduleResult = await scheduleResponse.json().catch(() => ({ success: false, schedules: [] }));
      const tasksResult = await tasksResponse.json().catch(() => ({ success: false, tasks: [] }));

      setLogs(result.logs || []);
      setStudySessions(result.sessions || []);
      if (tasksResult.success && tasksResult.tasks) {
        setTasks(tasksResult.tasks as typeof tasks);
      }

      const today = new Date().toDateString();
      const todaysCompletedSessions = (result.sessions || []).filter((session) => {
        return session.endTime && new Date(session.endTime).toDateString() === today;
      });

      setSessionsCompleted(todaysCompletedSessions.length);

      const mappedPlannedSessions: PlannedSession[] = (scheduleResult.schedules || [])
        .map((schedule: any) => {
          const scheduleData = schedule.scheduleData || {};
          if (scheduleData.type !== 'planner-session') {
            return null;
          }

          const start = new Date(schedule.startDate);
          const end = new Date(schedule.endDate);
          const duration = Math.max((end.getTime() - start.getTime()) / 60000, 30);

          return {
            id: schedule.id,
            title: schedule.title,
            subject: schedule.subject,
            startTime: scheduleData.startTime || start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            endTime: scheduleData.endTime || end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            duration,
            completed: Boolean(schedule.completed),
            taskId: scheduleData.taskId || null,
            date: schedule.startDate,
          };
        })
        .filter(Boolean)
        .filter((session: PlannedSession | null) => session && new Date(session.date).toDateString() === today) as PlannedSession[];

      setPlannedSessions(mappedPlannedSessions);
      setSelectedPlannedSession((prev) => {
        if (!prev) return null;
        return mappedPlannedSessions.find((session) => session.id === prev.id) || null;
      });
    } catch (error) {
      console.error('Failed to load productivity data:', error);
      setLogs([]);
      setStudySessions([]);
      setSessionsCompleted(0);
      setPlannedSessions([]);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProductivity();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const persistCompletedWorkSession = async () => {
    if (timerType !== 'work' || isSavingSession) {
      return;
    }

    setIsSavingSession(true);

    try {
      await fetch('/api/productivity/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentSubject,
          duration: selectedPlannedSession?.duration || pomodoroSettings.focusDuration,
          notes: currentTask ? `Completed Pomodoro for ${currentTask}` : 'Completed Pomodoro session',
          title: selectedPlannedSession?.title || currentTask,
          scheduleId: selectedPlannedSession?.id,
          taskId: selectedPlannedSession?.taskId || undefined,
        }),
      });

      await loadProductivity();
      setSelectedPlannedSession(null);
    } catch (error) {
      console.error('Failed to save completed session:', error);
    } finally {
      setIsSavingSession(false);
    }
  };

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }

          const completedType = timerType;

          queueMicrotask(() => {
            setIsRunning(false);
            setSessionsCompleted((count) => {
              const nextCount = completedType === 'work' ? count + 1 : count;
              const nextTimerType = completedType === 'work' && nextCount % 4 === 0 ? 'longBreak' : completedType === 'work' ? 'shortBreak' : 'work';
              setTimerType(nextTimerType);
              setTimeLeft(timerSettings[nextTimerType]);
              return nextCount;
            });

            if (completedType === 'work') {
              persistCompletedWorkSession().catch(() => undefined);
            }
          });

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timerType, timerSettings, currentSubject, currentTask, pomodoroSettings.focusDuration, selectedPlannedSession, isSavingSession]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimerState = () => {
    setIsRunning(false);
    if (selectedPlannedSession) {
      setTimeLeft(Math.round(selectedPlannedSession.duration * 60));
      return;
    }
    setTimeLeft(timerSettings[timerType]);
  };

  const switchTimerType = (type: 'work' | 'shortBreak' | 'longBreak') => {
    if (selectedPlannedSession) {
      return;
    }
    setIsRunning(false);
    setTimerType(type);
    setTimeLeft(timerSettings[type]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerDuration = selectedPlannedSession && timerType === 'work'
    ? selectedSessionDurationSeconds
    : timerSettings[timerType];
  const progress = timerDuration > 0 ? ((timerDuration - timeLeft) / timerDuration) * 100 : 0;

  const todayKey = new Date().toDateString();

  const todayLog = useMemo(() => {
    return logs.find((log) => new Date(log.date).toDateString() === todayKey) || null;
  }, [logs, todayKey]);

  const todaysSessions = useMemo(() => {
    return studySessions
      .filter((session) => session.endTime && new Date(session.endTime).toDateString() === todayKey)
      .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
  }, [studySessions, todayKey]);

  const streak = useMemo(() => {
    if (logs.length === 0) return 0;

    const logMap = new Map(
      logs
        .filter((log) => log.studyHours > 0 || log.tasksCompleted > 0 || log.pomodoroSessions > 0)
        .map((log) => [new Date(log.date).toDateString(), true])
    );

    let count = 0;
    const cursor = new Date();

    for (let i = 0; i < 365; i++) {
      const key = cursor.toDateString();
      if (logMap.has(key)) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }

      if (i === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }

      break;
    }

    return count;
  }, [logs]);

  const todayStats = {
    studyHours: todayLog?.studyHours || 0,
    sessionsCompleted: todaysSessions.length,
    focusScore: todayLog?.focusScore || 0,
    streak,
  };

  const weeklyHeatmap = useMemo<HeatmapRow[]>(() => {
    const days: HeatmapRow[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
      const hours = Array.from({ length: 24 }, () => 0);

      studySessions.forEach((session) => {
        const sessionDate = new Date(session.startTime);
        if (sessionDate.toDateString() !== date.toDateString()) {
          return;
        }

        const hour = sessionDate.getHours();
        const intensity = session.duration >= 60 ? 3 : session.duration >= 30 ? 2 : 1;
        hours[hour] = Math.max(hours[hour], intensity);
      });

      days.push({ day: dayLabel, hours });
    }

    return days;
  }, [studySessions]);

  const selectPlannedSession = (session: PlannedSession) => {
    setSelectedPlannedSession(session);
    setTimerType('work');
    setIsRunning(false);
    setTimeLeft(Math.round(session.duration * 60));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Productivity Tracker</h2>
          <p className="text-muted-foreground">Focus sessions and Pomodoro timer</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="gap-1">
            <Flame className="w-3 h-3" />
            {todayStats.streak} day streak
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Study Hours Today', value: `${todayStats.studyHours.toFixed(1)}h`, icon: Timer, color: 'text-violet-500' },
          { label: 'Sessions Completed', value: todayStats.sessionsCompleted.toString(), icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Focus Score', value: `${todayStats.focusScore}%`, icon: Target, color: 'text-blue-500' },
          { label: 'Current Streak', value: `${todayStats.streak} days`, icon: Flame, color: 'text-amber-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
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
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Pomodoro Timer
            </CardTitle>
            <CardDescription>Stay focused with the Pomodoro Technique</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={timerType} onValueChange={(v) => switchTimerType(v as 'work' | 'shortBreak' | 'longBreak')} className="mb-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="work" className="gap-1 px-1 text-xs sm:gap-2 sm:px-2 sm:text-sm" disabled={Boolean(selectedPlannedSession)}>
                  <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Focus
                </TabsTrigger>
                <TabsTrigger value="shortBreak" className="gap-1 px-1 text-xs sm:gap-2 sm:px-2 sm:text-sm" disabled={Boolean(selectedPlannedSession)}>
                  <Coffee className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Short Break
                </TabsTrigger>
                <TabsTrigger value="longBreak" className="gap-1 px-1 text-xs sm:gap-2 sm:px-2 sm:text-sm" disabled={Boolean(selectedPlannedSession)}>
                  <Coffee className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Long Break
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col items-center py-8">
              <div className="relative w-64 h-64">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className={cn(
                      timerType === 'work' && 'text-violet-500',
                      timerType === 'shortBreak' && 'text-emerald-500',
                      timerType === 'longBreak' && 'text-blue-500'
                    )}
                    style={{
                      strokeDasharray: 2 * Math.PI * 120,
                      strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100),
                    }}
                    initial={false}
                    animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span key={timeLeft} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-6xl font-bold tabular-nums">
                    {formatTime(timeLeft)}
                  </motion.span>
                  {timerType === 'work' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentTask || 'No active task selected'}
                    </p>
                  )}
                  {selectedPlannedSession && (
                    <p className="text-xs text-violet-500 mt-1">
                      Locked to selected session
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-8">
                <Button variant="outline" size="icon" className="w-12 h-12 rounded-full" onClick={resetTimerState}>
                  <RotateCcw className="w-5 h-5" />
                </Button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTimer}
                  className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center',
                    'shadow-lg transition-colors',
                    timerType === 'work' && 'bg-violet-500 hover:bg-violet-600 text-white',
                    timerType === 'shortBreak' && 'bg-emerald-500 hover:bg-emerald-600 text-white',
                    timerType === 'longBreak' && 'bg-blue-500 hover:bg-blue-600 text-white'
                  )}
                >
                  {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </motion.button>
                <Button variant="outline" size="icon" className="w-12 h-12 rounded-full" onClick={() => loadProductivity()}>
                  <Zap className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <span className="text-sm text-muted-foreground">Today:</span>
                {[1, 2, 3, 4].map((session) => (
                  <div
                    key={session}
                    className={cn('w-3 h-3 rounded-full', session <= (todayStats.sessionsCompleted % 4 || 4) && todayStats.sessionsCompleted > 0 ? 'bg-violet-500' : 'bg-muted')}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Planned Sessions</CardTitle>
            <CardDescription>{plannedSessions.length} sessions available to start</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plannedSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No planned sessions for today yet.</p>
              ) : (
                plannedSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      session.completed
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : selectedPlannedSession?.id === session.id
                        ? 'border-violet-500 bg-violet-500/5'
                        : 'border-border hover:border-violet-300'
                    )}
                    onClick={() => !session.completed && selectPlannedSession(session)}
                  >
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', session.completed ? 'bg-emerald-500/10' : 'bg-violet-500/10')}>
                      <CheckCircle className={cn('w-4 h-4', session.completed ? 'text-emerald-500' : 'text-violet-500')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.duration} min • {session.startTime} - {session.endTime}
                      </p>
                    </div>
                    {session.completed && <Badge variant="secondary">Done</Badge>}
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completed Sessions Today</CardTitle>
          <CardDescription>{todaysSessions.length} sessions recorded in productivity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todaysSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed sessions recorded yet today.</p>
            ) : (
              todaysSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.duration} min • {new Date(session.endTime || session.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Weekly Activity Heatmap
          </CardTitle>
          <CardDescription>Your recorded study activity this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex mb-2">
                <div className="w-12" />
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                    {i % 6 === 0 ? `${i}` : ''}
                  </div>
                ))}
              </div>

              {weeklyHeatmap.map((row) => (
                <div key={row.day} className="flex items-center gap-1 mb-1">
                  <div className="w-12 text-xs text-muted-foreground">{row.day}</div>
                  <div className="flex gap-0.5 flex-1">
                    {row.hours.map((intensity, hour) => (
                      <div
                        key={hour}
                        className={cn(
                          'flex-1 h-6 rounded-sm',
                          intensity === 0 && 'bg-muted',
                          intensity === 1 && 'bg-violet-200 dark:bg-violet-900',
                          intensity === 2 && 'bg-violet-400 dark:bg-violet-700',
                          intensity === 3 && 'bg-violet-600 dark:bg-violet-500'
                        )}
                        title={`${row.day} ${hour}:00 - ${intensity > 0 ? 'Recorded study activity' : 'No activity'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 mt-4">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-sm bg-muted" />
                  <div className="w-4 h-4 rounded-sm bg-violet-200 dark:bg-violet-900" />
                  <div className="w-4 h-4 rounded-sm bg-violet-400 dark:bg-violet-700" />
                  <div className="w-4 h-4 rounded-sm bg-violet-600 dark:bg-violet-500" />
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Quick Focus Session',
            description: `Start a ${pomodoroSettings.focusDuration}-minute focus session immediately`,
            icon: Zap,
            color: 'from-violet-500 to-purple-600',
            action: () => {
              setSelectedPlannedSession(null);
              setTimerType('work');
              setTimeLeft(timerSettings.work);
              setIsRunning(true);
            },
          },
          {
            title: 'Take a Break',
            description: `${pomodoroSettings.shortBreak}-minute break to recharge`,
            icon: Coffee,
            color: 'from-emerald-500 to-teal-600',
            action: () => {
              setSelectedPlannedSession(null);
              setTimerType('shortBreak');
              setTimeLeft(timerSettings.shortBreak);
              setIsRunning(true);
            },
          },
          {
            title: 'Long Break',
            description: `${pomodoroSettings.longBreak}-minute break after 4 sessions`,
            icon: Coffee,
            color: 'from-blue-500 to-cyan-600',
            action: () => {
              setSelectedPlannedSession(null);
              setTimerType('longBreak');
              setTimeLeft(timerSettings.longBreak);
              setIsRunning(true);
            },
          },
        ].map((action) => (
          <motion.div key={action.title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer overflow-hidden" onClick={action.action}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', action.color)}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
