// API utilities for client-side data fetching

const API_BASE = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'An error occurred',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) =>
    fetchApi<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: async (email: string, password: string, name?: string) =>
    fetchApi<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: async () =>
    fetchApi('/auth/logout', { method: 'POST' }),

  refresh: async () =>
    fetchApi<{ user: any; token: string }>('/auth/refresh', { method: 'POST' }),

  me: async () =>
    fetchApi<{ user: any }>('/auth/me'),
};

// Tasks API
export const tasksApi = {
  getAll: async (filters?: { status?: string; priority?: string; subject?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.subject) params.set('subject', filters.subject);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<{ tasks: any[] }>(`/tasks${query}`);
  },

  getById: async (id: string) =>
    fetchApi<{ task: any }>(`/tasks/${id}`),

  create: async (task: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    subject?: string;
    tags?: string[];
    estimatedMinutes?: number;
  }) =>
    fetchApi<{ task: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  update: async (id: string, updates: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    subject: string;
    tags: string[];
    completedAt: string;
    actualMinutes: number;
  }>) =>
    fetchApi<{ task: any }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: async (id: string) =>
    fetchApi(`/tasks/${id}`, { method: 'DELETE' }),

  reorder: async (taskIds: string[]) =>
    fetchApi('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ taskIds }),
    }),
};

// Schedule API
export const scheduleApi = {
  generate: async (data: {
    subjects: string[];
    examDates: { subject: string; date: string }[];
    dailyStudyHours: number;
    difficultyLevels: { subject: string; level: string }[];
    priorities: { subject: string; priority: string }[];
  }) =>
    fetchApi<{ schedule: any }>('/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: async () =>
    fetchApi<{ schedules: any[] }>('/schedule'),

  getById: async (id: string) =>
    fetchApi<{ schedule: any }>(`/schedule/${id}`),

  update: async (id: string, updates: any) =>
    fetchApi<{ schedule: any }>(`/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: async (id: string) =>
    fetchApi(`/schedule/${id}`, { method: 'DELETE' }),
};

// Productivity API
export const productivityApi = {
  logSession: async (data: {
    subject: string;
    topic?: string;
    startTime: string;
    endTime?: string;
    duration: number;
    focusScore?: number;
    notes?: string;
    productivity?: number;
  }) =>
    fetchApi<{ session: any }>('/productivity/session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStats: async (period?: 'day' | 'week' | 'month') => {
    const query = period ? `?period=${period}` : '';
    return fetchApi<{ stats: any }>(`/productivity/stats${query}`);
  },

  logPomodoro: async (data: {
    type: 'work' | 'break';
    duration: number;
    task?: string;
    completed: boolean;
  }) =>
    fetchApi<{ session: any }>('/productivity/pomodoro', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLogs: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<{ logs: any[] }>(`/productivity/logs${query}`);
  },
};

// Analytics API
export const analyticsApi = {
  getOverview: async () =>
    fetchApi<{ overview: any }>('/analytics'),

  getWeeklyData: async () =>
    fetchApi<{ data: any[] }>('/analytics/weekly'),

  getSubjectProgress: async () =>
    fetchApi<{ progress: any[] }>('/analytics/subjects'),

  getProductivityTrends: async (period?: string) => {
    const query = period ? `?period=${period}` : '';
    return fetchApi<{ trends: any[] }>(`/analytics/trends${query}`);
  },
};

// AI Insights API
export const aiApi = {
  generateInsights: async () =>
    fetchApi<{ insights: any }>('/ai/insights', { method: 'POST' }),

  getRecommendations: async (context?: string) =>
    fetchApi<{ recommendations: any[] }>('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ context }),
    }),

  analyzePatterns: async () =>
    fetchApi<{ patterns: any }>('/ai/patterns', { method: 'POST' }),
};

// Skills API
export const skillsApi = {
  getAll: async () =>
    fetchApi<{ skills: any[] }>('/skills'),

  create: async (skill: {
    name: string;
    category?: string;
    level?: number;
    targetLevel?: number;
  }) =>
    fetchApi<{ skill: any }>('/skills', {
      method: 'POST',
      body: JSON.stringify(skill),
    }),

  update: async (id: string, updates: Partial<{
    level: number;
    progress: number;
    notes: string;
  }>) =>
    fetchApi<{ skill: any }>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: async (id: string) =>
    fetchApi(`/skills/${id}`, { method: 'DELETE' }),
};
