"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  CheckCircle,
  Target,
  Award,
  ArrowUpRight,
  Download,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface AnalyticsOverview {
  totalStudyHours: number;
  totalSessions: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksInProgress: number;
  averageFocusScore: number;
  currentStreak: number;
}

interface WeeklyPoint {
  day: string;
  date: string;
  hours: number;
  tasks: number;
  focusScore: number;
}

interface SubjectDistributionItem {
  name: string;
  value: number;
  minutes: number;
  color: string;
}

interface SkillPoint {
  name: string;
  progress: number;
  level: number;
}

interface MonthlyGroup {
  week: number;
  totalStudyHours: number;
  totalTasksCompleted: number;
  averageFocusScore: number;
  totalPomodoroSessions: number;
}

interface AnalyticsResponse {
  success: boolean;
  overview?: AnalyticsOverview;
  weeklyData?: WeeklyPoint[];
  subjectDistribution?: SubjectDistributionItem[];
  skills?: SkillPoint[];
}

interface MonthlyResponse {
  weeklyGroups?: MonthlyGroup[];
}

const emptyOverview: AnalyticsOverview = {
  totalStudyHours: 0,
  totalSessions: 0,
  tasksCompleted: 0,
  tasksPending: 0,
  tasksInProgress: 0,
  averageFocusScore: 0,
  currentStreak: 0,
};

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview>(emptyOverview);
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<SubjectDistributionItem[]>([]);
  const [skills, setSkills] = useState<SkillPoint[]>([]);
  const [monthlyGroups, setMonthlyGroups] = useState<MonthlyGroup[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);

      try {
        const [analyticsResponse, monthlyResponse] = await Promise.all([
          fetch('/api/analytics', { cache: 'no-store' }),
          fetch('/api/analytics/monthly', { cache: 'no-store' }),
        ]);

        const analyticsData: AnalyticsResponse = await analyticsResponse.json().catch(() => ({ success: false }));
        const monthlyData: MonthlyResponse = await monthlyResponse.json().catch(() => ({}));

        setOverview(analyticsData.overview || emptyOverview);
        setWeeklyData(analyticsData.weeklyData || []);
        setSubjectDistribution(analyticsData.subjectDistribution || []);
        setSkills(analyticsData.skills || []);
        setMonthlyGroups(monthlyData.weeklyGroups || []);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setOverview(emptyOverview);
        setWeeklyData([]);
        setSubjectDistribution([]);
        setSkills([]);
        setMonthlyGroups([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics().catch(() => {
      setIsLoading(false);
    });
  }, [timeRange]);

  const hasAnyData = useMemo(() => {
    return (
      overview.totalStudyHours > 0 ||
      overview.tasksCompleted > 0 ||
      overview.tasksPending > 0 ||
      weeklyData.some((item) => item.hours > 0 || item.tasks > 0 || item.focusScore > 0) ||
      subjectDistribution.length > 0 ||
      skills.length > 0
    );
  }, [overview, weeklyData, subjectDistribution, skills]);

  const completionRate = useMemo(() => {
    const total = overview.tasksCompleted + overview.tasksPending + overview.tasksInProgress;
    return total > 0 ? Math.round((overview.tasksCompleted / total) * 100) : 0;
  }, [overview]);

  const skillRadar = useMemo(() => {
    return skills.slice(0, 6).map((skill) => ({
      subject: skill.name,
      score: skill.progress || Math.min(skill.level * 20, 100),
    }));
  }, [skills]);

  const completionTrend = useMemo(() => {
    return weeklyData.map((item) => {
      const totalTasks = item.tasks;
      return {
        day: item.day,
        rate: totalTasks > 0 ? 100 : 0,
        hours: item.hours,
        focusScore: item.focusScore,
      };
    });
  }, [weeklyData]);

  const monthlyTrend = useMemo(() => {
    return monthlyGroups.map((group) => ({
      week: `Week ${group.week}`,
      hours: Number(group.totalStudyHours.toFixed(1)),
      tasks: group.totalTasksCompleted,
      focusScore: Math.round(group.averageFocusScore || 0),
    }));
  }, [monthlyGroups]);

  const topSubjects = useMemo(() => {
    return [...subjectDistribution]
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5)
      .map((item) => ({
        topic: item.name,
        score: item.value,
      }));
  }, [subjectDistribution]);

  const bestDay = useMemo(() => {
    return weeklyData.reduce<WeeklyPoint | null>((best, item) => {
      if (!best || item.hours > best.hours) return item;
      return best;
    }, null);
  }, [weeklyData]);

  const peakFocusDay = useMemo(() => {
    return weeklyData.reduce<WeeklyPoint | null>((best, item) => {
      if (!best || item.focusScore > best.focusScore) return item;
      return best;
    }, null);
  }, [weeklyData]);

  const mostStudiedSubject = useMemo(() => {
    return subjectDistribution[0] || null;
  }, [subjectDistribution]);

  const stats = [
    {
      label: 'Total Study Hours',
      value: `${overview.totalStudyHours.toFixed(1)}h`,
      change: `${overview.totalSessions} sessions`,
      icon: Clock,
      color: 'text-violet-500',
    },
    {
      label: 'Tasks Completed',
      value: overview.tasksCompleted.toString(),
      change: `${overview.tasksPending} pending`,
      icon: CheckCircle,
      color: 'text-emerald-500',
    },
    {
      label: 'Avg. Focus Score',
      value: `${overview.averageFocusScore}%`,
      change: `${completionRate}% completion`,
      icon: Target,
      color: 'text-blue-500',
    },
    {
      label: 'Current Streak',
      value: `${overview.currentStreak} days`,
      change: overview.currentStreak > 0 ? 'Active streak' : 'No streak yet',
      icon: Award,
      color: 'text-amber-500',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">Detailed insights into your learning progress</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={(v: 'week' | 'month' | 'year') => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" disabled>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs font-medium text-muted-foreground">{stat.change}</span>
                      </div>
                    </div>
                    <div className={cn('w-10 h-10 rounded-lg bg-muted flex items-center justify-center', stat.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {!isLoading && !hasAnyData && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
            <p className="font-medium">No analytics yet</p>
            <p className="text-sm text-muted-foreground">
              Your charts will fill in as you complete tasks and record study sessions.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Study Hours</CardTitle>
            <CardDescription>Hours studied this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study Time by Subject</CardTitle>
            <CardDescription>Distribution based on your recorded sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectDistribution.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No subject study data yet
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => [`${props.payload.minutes} min`, props.payload.name]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Progress Trend</CardTitle>
            <CardDescription>Study hours and completed tasks by week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorHours)" name="Hours" />
                  <Area type="monotone" dataKey="tasks" stroke="#10b981" fillOpacity={1} fill="url(#colorTasks)" name="Tasks" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill Assessment</CardTitle>
            <CardDescription>Based on your tracked skills</CardDescription>
          </CardHeader>
          <CardContent>
            {skillRadar.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No skills tracked yet
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={skillRadar}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis dataKey="subject" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Focus Score</CardTitle>
          <CardDescription>Focus trend from your daily logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value}%`, 'Focus Score']}
                />
                <Line type="monotone" dataKey="focusScore" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Most Studied Subjects
            </CardTitle>
            <CardDescription>Based on recorded session time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subject performance data yet.</p>
              ) : (
                topSubjects.map((topic, index) => (
                  <motion.div
                    key={topic.topic}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{topic.topic}</span>
                        <span className="text-sm font-bold">{topic.score}%</span>
                      </div>
                      <Progress value={topic.score} className="h-2" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border-violet-500/20">
          <CardHeader>
            <CardTitle>Weekly Insights</CardTitle>
            <CardDescription>Key takeaways from your actual study history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: Clock,
                  title: 'Best Study Day',
                  value: bestDay ? bestDay.day : 'No data',
                  description: bestDay ? `${bestDay.hours.toFixed(1)} hours recorded` : 'Complete study sessions to identify your best day',
                  color: 'text-emerald-500',
                },
                {
                  icon: Target,
                  title: 'Highest Focus Day',
                  value: peakFocusDay ? peakFocusDay.day : 'No data',
                  description: peakFocusDay ? `${peakFocusDay.focusScore}% average focus` : 'Log focus scores to see your peak day',
                  color: 'text-blue-500',
                },
                {
                  icon: BookOpen,
                  title: 'Most Studied Subject',
                  value: mostStudiedSubject ? mostStudiedSubject.name : 'No data',
                  description: mostStudiedSubject ? `${mostStudiedSubject.minutes} minutes tracked` : 'Study sessions will build your subject breakdown',
                  color: 'text-violet-500',
                },
                {
                  icon: CheckCircle,
                  title: 'Task Completion',
                  value: `${completionRate}%`,
                  description: `${overview.tasksCompleted} completed out of ${overview.tasksCompleted + overview.tasksPending + overview.tasksInProgress} tracked tasks`,
                  color: 'text-amber-500',
                },
              ].map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <motion.div
                    key={insight.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background"
                  >
                    <div className={cn('w-8 h-8 rounded-lg bg-muted flex items-center justify-center', insight.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{insight.title}</span>
                        <span className="text-sm font-semibold">{insight.value}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
