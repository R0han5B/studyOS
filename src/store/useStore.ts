import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  completedAt: string | null;
  subject: string | null;
  tags: string[];
  order: number;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subject: string;
  topic: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  focusScore: number | null;
  notes: string | null;
  productivity: number;
  createdAt: string;
}

export interface ProductivityLog {
  id: string;
  date: string;
  studyHours: number;
  tasksCompleted: number;
  focusScore: number;
  pomodoroSessions: number;
  peakHours: number[];
  mood: number | null;
  notes: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: number;
  progress: number;
  targetLevel: number | null;
  notes: string | null;
}

export interface Schedule {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  scheduleData: any;
  aiGenerated: boolean;
  createdAt: string;
}

export type PageType = 
  | 'dashboard' 
  | 'planner' 
  | 'tasks' 
  | 'productivity' 
  | 'insights' 
  | 'career'
  | 'analytics' 
  | 'settings';

export type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'preferences';

export interface PomodoroSettings {
  focusDuration: number; // in minutes
  shortBreak: number; // in minutes
  longBreak: number; // in minutes
  dailyGoal: number; // in hours
  weeklyGoal: number; // in hours
}

export type AccentColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Navigation
  currentPage: PageType;
  settingsTab: SettingsTab;
  sidebarOpen: boolean;
  
  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  taskFilters: {
    status: string;
    priority: string;
    subject: string;
    search: string;
  };
  
  // Study Sessions
  studySessions: StudySession[];
  
  // Productivity
  productivityLogs: ProductivityLog[];
  currentPomodoro: {
    isRunning: boolean;
    type: 'work' | 'break';
    timeLeft: number;
    totalDuration: number;
    sessionsCompleted: number;
  };
  pomodoroSettings: PomodoroSettings;
  
  // Skills
  skills: Skill[];
  
  // Schedules
  schedules: Schedule[];
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  accentColor: AccentColor;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  
  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setCurrentPage: (page: PageType) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  setSidebarOpen: (open: boolean) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskFilters: (filters: Partial<AppState['taskFilters']>) => void;
  setStudySessions: (sessions: StudySession[]) => void;
  setProductivityLogs: (logs: ProductivityLog[]) => void;
  updatePomodoro: (updates: Partial<AppState['currentPomodoro']>) => void;
  resetPomodoro: () => void;
  setPomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
  setSkills: (skills: Skill[]) => void;
  setSchedules: (schedules: Schedule[]) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: AccentColor) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  logout: () => void;
}

const defaultPomodoro = {
  isRunning: false,
  type: 'work' as const,
  timeLeft: 25 * 60, // 25 minutes in seconds
  totalDuration: 25 * 60,
  sessionsCompleted: 0,
};

const defaultPomodoroSettings: PomodoroSettings = {
  focusDuration: 25, // minutes
  shortBreak: 5, // minutes
  longBreak: 15, // minutes
  dailyGoal: 4, // hours
  weeklyGoal: 28, // hours
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      currentPage: 'dashboard',
      settingsTab: 'profile',
      sidebarOpen: true,
      
      tasks: [],
      tasksLoading: false,
      taskFilters: {
        status: 'all',
        priority: 'all',
        subject: 'all',
        search: '',
      },
      
      studySessions: [],
      
      productivityLogs: [],
      currentPomodoro: defaultPomodoro,
      pomodoroSettings: defaultPomodoroSettings,
      
      skills: [],
      schedules: [],
      
      theme: 'system',
      accentColor: 'violet',
      
      notifications: [],
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setIsAuthenticated: (value) => set({ isAuthenticated: value }),
      setIsLoading: (value) => set({ isLoading: value }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setSettingsTab: (settingsTab) => set({ settingsTab }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      })),
      setTaskFilters: (filters) => set((state) => ({
        taskFilters: { ...state.taskFilters, ...filters },
      })),
      
      setStudySessions: (sessions) => set({ studySessions: sessions }),
      setProductivityLogs: (logs) => set({ productivityLogs: logs }),
      
      updatePomodoro: (updates) => set((state) => ({
        currentPomodoro: { ...state.currentPomodoro, ...updates },
      })),
      resetPomodoro: () => set({ currentPomodoro: defaultPomodoro }),
      setPomodoroSettings: (settings) => set((state) => ({
        pomodoroSettings: { ...state.pomodoroSettings, ...settings },
      })),
      
      setSkills: (skills) => set({ skills }),
      setSchedules: (schedules) => set({ schedules }),
      
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      
      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id, timestamp: Date.now() },
          ],
        }));
        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(id);
        }, 5000);
      },
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        tasks: [],
        studySessions: [],
        productivityLogs: [],
        skills: [],
        schedules: [],
        notifications: [],
      }),
    }),
    {
      name: 'study-planner-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        accentColor: state.accentColor,
        sidebarOpen: state.sidebarOpen,
        currentPomodoro: state.currentPomodoro,
        pomodoroSettings: state.pomodoroSettings,
      }),
    }
  )
);
