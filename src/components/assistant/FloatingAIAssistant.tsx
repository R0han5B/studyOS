"use client";

import React, { useMemo, useState } from 'react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStore, Task } from '@/store/useStore';

interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

interface InsightsResponse {
  success: boolean;
  answer?: string;
  report?: {
    totalTasks: number;
    completedTasks: number;
    totalStudyHours: number;
    totalStudySessions: number;
    avgFocusScore: number;
  };
}

const initialAssistantMessage: AssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hey, how can I help you today? I can answer study questions, help you plan revision, or build a study plan with subjects, exam date, start time, and task creation.',
};

export function FloatingAIAssistant() {
  const { setTasks } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'planner'>('chat');
  const [messages, setMessages] = useState<AssistantMessage[]>([initialAssistantMessage]);
  const [plannerForm, setPlannerForm] = useState({
    subjects: '',
    dailyHours: '4',
    examDate: '',
    startTime: '09:00',
    addToTasks: true,
  });
  const hasConversationStarted = messages.length > 1;

  const canGeneratePlan = useMemo(() => {
    return plannerForm.subjects.trim().length > 0 && plannerForm.examDate;
  }, [plannerForm]);

  const resetCoach = () => {
    setMessages([initialAssistantMessage]);
    setMode('chat');
    setInput('');
    setIsLoading(false);
    setPlannerForm({
      subjects: '',
      dailyHours: '4',
      examDate: '',
      startTime: '09:00',
      addToTasks: true,
    });
  };

  const refreshTasks = async () => {
    const response = await fetch('/api/tasks', { cache: 'no-store' });
    const result = await response.json().catch(() => ({ success: false, tasks: [] }));
    if (result.success && result.tasks) {
      setTasks(result.tasks as Task[]);
    }
  };

  const submitQuestion = async () => {
    if (!input.trim()) return;

    const question = input.trim();
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', text: question }]);
    setInput('');

    if (/study plan|schedule|planner/i.test(question)) {
      setMode('planner');
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'Sure. Tell me what you are preparing for, when the exam is, what time you want to start studying, and whether you want each session added to tasks. I will build it around that.',
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const result: InsightsResponse = await response.json().catch(() => ({ success: false }));
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.answer || 'I could not generate an answer right now.',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'I ran into an error while answering that. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!canGeneratePlan) return;

    setIsLoading(true);
    try {
      const subjects = plannerForm.subjects
        .split(',')
        .map((subject) => subject.trim())
        .filter(Boolean);

      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects,
          dailyHours: parseInt(plannerForm.dailyHours, 10),
          examDate: plannerForm.examDate,
          startTime: plannerForm.startTime,
          addToTasks: plannerForm.addToTasks,
        }),
      });

      const result = await response.json().catch(() => ({ success: false }));
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate plan');
      }

      if (plannerForm.addToTasks) {
        await refreshTasks();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: `Created ${result.createdSchedules?.length || 0} study sessions before the exam. ${plannerForm.addToTasks ? 'The sessions were also added to your tasks.' : ''}`,
        },
      ]);
      setMode('chat');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Failed to generate the study plan.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg text-white"
        size="icon"
        aria-label="Open AI Coach"
        style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[min(440px,calc(100vw-1.5rem))] shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-accent-500" />
                  AI Coach
                </CardTitle>
                <CardDescription>Available from every page with your study data and general guidance</CardDescription>
              </div>
              {hasConversationStarted && (
                <Button variant="ghost" size="sm" onClick={resetCoach} className="shrink-0">
                  Reset chat
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-full break-words rounded-lg px-3 py-2 text-sm leading-6 ${
                    message.role === 'user' ? 'text-white ml-10' : 'bg-muted mr-8'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: 'var(--accent-500)' } : undefined}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-2 pl-5 last:mb-0">{children}</ol>,
                        ul: ({ children }) => <ul className="mb-3 list-disc space-y-2 pl-5 last:mb-0">{children}</ul>,
                        li: ({ children }) => <li className="pl-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children }) => <code className="rounded bg-background/70 px-1 py-0.5 text-[0.9em]">{children}</code>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    message.text
                  )}
                </div>
              ))}
            </div>

            {mode === 'planner' ? (
              <div className="space-y-4 rounded-xl border p-4">
                <Badge variant="secondary">Study Plan Builder</Badge>
                <p className="text-sm text-muted-foreground leading-6">
                  Add your subjects, choose the exam date, set the time you want the first session to begin, and decide whether each generated session should also appear in tasks.
                </p>
                <Input
                  placeholder="Subjects, comma separated. Example: Math, Physics, Chemistry"
                  value={plannerForm.subjects}
                  onChange={(e) => setPlannerForm((prev) => ({ ...prev, subjects: e.target.value }))}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Exam date</p>
                    <Input
                      type="date"
                      aria-label="Exam date"
                      value={plannerForm.examDate}
                      onChange={(e) => setPlannerForm((prev) => ({ ...prev, examDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Preferred start time</p>
                    <Input
                      type="time"
                      aria-label="First session start time"
                      value={plannerForm.startTime}
                      onChange={(e) => setPlannerForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Study hours per day</p>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={plannerForm.dailyHours}
                    onChange={(e) => setPlannerForm((prev) => ({ ...prev, dailyHours: e.target.value }))}
                    placeholder="Hours per day"
                  />
                </div>
                <label className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                  <span>Add sessions directly to tasks</span>
                  <input
                    type="checkbox"
                    checked={plannerForm.addToTasks}
                    onChange={(e) => setPlannerForm((prev) => ({ ...prev, addToTasks: e.target.checked }))}
                  />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setMode('chat')}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={generatePlan} disabled={!canGeneratePlan || isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {!hasConversationStarted && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Quick prompts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'How can I improve my focus?',
                        'What should I study today?',
                        'Create a study plan for me',
                      ].map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => setInput(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Input
                    placeholder="Ask about your studies..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                    className="min-h-11"
                  />
                  <Button onClick={submitQuestion} disabled={isLoading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
