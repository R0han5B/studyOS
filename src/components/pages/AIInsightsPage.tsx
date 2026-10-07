"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Brain,
  BookOpen,
  RefreshCw,
  ChevronRight,
  Zap,
  FileText,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Insight {
  type: 'strength' | 'improvement' | 'recommendation' | 'alert';
  title: string;
  description: string;
  action?: string;
}

interface SubjectReportItem {
  subject: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface AIInsightsData {
  insights: Insight[];
  learningStyle: {
    Visual: number;
    'Reading/Writing': number;
    Auditory: number;
    Kinesthetic: number;
  };
  studyTip: string;
  answer?: string;
  report?: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyMinutes: number;
    totalStudyHours: number;
    totalStudySessions: number;
    avgFocusScore: number;
    activeSubjects: number;
    trackedSkills: number;
    targetRole?: string | null;
    careerGoal?: string | null;
    subjectReport: SubjectReportItem[];
    generatedAt: string;
  };
}

const learningStyles = [
  { style: 'Visual', key: 'Visual' as const },
  { style: 'Reading/Writing', key: 'Reading/Writing' as const },
  { style: 'Auditory', key: 'Auditory' as const },
  { style: 'Kinesthetic', key: 'Kinesthetic' as const },
];

function buildSubjectRecommendation(subject: SubjectReportItem) {
  if (subject.completionRate === 0) {
    return `You have tasks in ${subject.subject}, but none are completed yet. Start with one small win to build momentum.`;
  }

  if (subject.completionRate < 50) {
    return `Your ${subject.subject} completion rate is low. Break pending work into smaller chunks and schedule focused review sessions.`;
  }

  if (subject.completionRate < 80) {
    return `You are making steady progress in ${subject.subject}. Keep consistency high and close out the remaining tasks this week.`;
  }

  return `You are performing well in ${subject.subject}. Maintain the pace and raise the difficulty of your next tasks gradually.`;
}

export function AIInsightsPage() {
  const { tasks } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'strength' | 'improvement' | 'recommendation' | 'alert'>('all');

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void generateInsights();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredInsights = data?.insights?.filter(
    (insight) => selectedCategory === 'all' || insight.type === selectedCategory
  ) || [];

  const report = data?.report;

  const subjectRecommendations = useMemo(() => {
    return (report?.subjectReport || []).slice(0, 4).map((subject) => ({
      subject: subject.subject,
      current: subject.completionRate,
      target: Math.min(subject.completionRate + 15, 100),
      recommendation: buildSubjectRecommendation(subject),
    }));
  }, [report]);

  const learningStyleHasData = useMemo(() => {
    if (!data?.learningStyle) return false;
    return Object.values(data.learningStyle).some((value) => value > 0);
  }, [data]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength':
        return CheckCircle;
      case 'improvement':
        return Target;
      case 'recommendation':
        return Lightbulb;
      case 'alert':
        return AlertTriangle;
      default:
        return Sparkles;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'strength':
        return 'border-emerald-500/50 bg-emerald-500/5';
      case 'improvement':
        return 'border-amber-500/50 bg-amber-500/5';
      case 'recommendation':
        return 'border-blue-500/50 bg-blue-500/5';
      case 'alert':
        return 'border-rose-500/50 bg-rose-500/5';
      default:
        return 'border-border';
    }
  };

  const getInsightIconColor = (type: string) => {
    switch (type) {
      case 'strength':
        return 'text-emerald-500';
      case 'improvement':
        return 'text-amber-500';
      case 'recommendation':
        return 'text-blue-500';
      case 'alert':
        return 'text-rose-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" />
            AI Insights
          </h2>
          <p className="text-muted-foreground">Personalized recommendations that use your study report when available and still help when you are just getting started</p>
        </div>
        <Button onClick={generateInsights} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          {isLoading ? 'Analyzing...' : 'Refresh Insights'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tasks Analyzed', value: report?.totalTasks?.toString() || tasks.length.toString(), icon: Target, color: 'text-violet-500' },
          { label: 'Insights Generated', value: data?.insights?.length?.toString() || '0', icon: Sparkles, color: 'text-amber-500' },
          { label: 'Study Hours', value: `${report?.totalStudyHours?.toFixed(1) || '0.0'}h`, icon: Clock, color: 'text-blue-500' },
          { label: 'Active Subjects', value: report?.activeSubjects?.toString() || '0', icon: Zap, color: 'text-emerald-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg bg-muted flex items-center justify-center', stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-500" />
            Current User Report
          </CardTitle>
          <CardDescription>The AI uses this report as the basis for its answers and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-lg font-semibold">{report?.completionRate || 0}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Study Sessions</p>
              <p className="text-lg font-semibold">{report?.totalStudySessions || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Focus</p>
              <p className="text-lg font-semibold">{report?.avgFocusScore || 0}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tracked Skills</p>
              <p className="text-lg font-semibold">{report?.trackedSkills || 0}</p>
            </div>
          </div>
          {(report?.targetRole || report?.careerGoal) && (
            <div className="mt-4 grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Target role</p><p className="font-medium">{report.targetRole || 'Not set'}</p></div>
              <div><p className="text-xs text-muted-foreground">Career goal</p><p className="font-medium">{report.careerGoal || 'Not set'}</p></div>
            </div>
          )}
          {report?.subjectReport?.length ? (
            <div className="mt-4 space-y-3">
              {report.subjectReport.slice(0, 4).map((subject) => (
                <div key={subject.subject}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{subject.subject}</span>
                    <span>{subject.completedTasks}/{subject.totalTasks} tasks</span>
                  </div>
                  <Progress value={subject.completionRate} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No subject report yet. Start recording tasks and sessions to give the AI real study data to analyze.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personalized Insights</CardTitle>
                <CardDescription>Generated from the current user's study report</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'strength', label: 'Strengths' },
                { id: 'improvement', label: 'Improvements' },
                { id: 'recommendation', label: 'Recommendations' },
                { id: 'alert', label: 'Alerts' },
              ].map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id as 'all' | 'strength' | 'improvement' | 'recommendation' | 'alert')}
                  className="whitespace-nowrap"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredInsights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No personalized insights yet.</p>
                  <p className="text-sm">Track some study activity and refresh this page.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredInsights.map((insight, index) => {
                    const Icon = getInsightIcon(insight.type);
                    return (
                      <motion.div
                        key={`${insight.title}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn('p-4 rounded-xl border-2 transition-all cursor-pointer', getInsightColor(insight.type), 'hover:shadow-md')}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn('w-10 h-10 rounded-lg bg-muted flex items-center justify-center', getInsightIconColor(insight.type))}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{insight.title}</h4>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {insight.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                            {insight.action && (
                              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                                {insight.action}
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Learning Style
              </CardTitle>
              <CardDescription>Your dominant learning preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {learningStyleHasData ? (
                <div className="space-y-4">
                  {learningStyles.map((style) => (
                    <div key={style.style} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{style.style}</span>
                        <span className="font-medium">{data?.learningStyle?.[style.key] || 0}%</span>
                      </div>
                      <Progress value={data?.learningStyle?.[style.key] || 0} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not enough study history yet to estimate a learning style profile.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Study Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {data?.studyTip || 'Track your first task or study session to unlock personalized study advice.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Subject-Specific Recommendations
          </CardTitle>
          <CardDescription>Generated from the current user's subject report</CardDescription>
        </CardHeader>
        <CardContent>
          {subjectRecommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subject recommendations yet because no subject data has been recorded.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectRecommendations.map((subject, index) => (
                <motion.div
                  key={subject.subject}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{subject.subject}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{subject.current}%</span>
                      <span>→</span>
                      <span className="text-violet-500 font-medium">{subject.target}%</span>
                    </div>
                  </div>
                  <Progress value={subject.current} className="h-2 mb-3" />
                  <p className="text-sm text-muted-foreground">{subject.recommendation}</p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </motion.div>
  );
}
