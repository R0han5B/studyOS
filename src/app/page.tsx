"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useStore } from '@/store/useStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { LoginPage } from '@/components/pages/LoginPage';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { TaskManagerPage } from '@/components/pages/TaskManagerPage';
import { StudyPlannerPage } from '@/components/pages/StudyPlannerPage';
import { ProductivityPage } from '@/components/pages/ProductivityPage';
import { AIInsightsPage } from '@/components/pages/AIInsightsPage';
import { AnalyticsPage } from '@/components/pages/AnalyticsPage';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { CareerPage } from '@/components/pages/CareerPage';
import { FloatingAIAssistant } from '@/components/assistant/FloatingAIAssistant';
import { cn } from '@/lib/utils';
import { tasksApi } from '@/lib/api';

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div
          className="w-16 h-16 mx-auto rounded-2xl animate-pulse"
          style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
        />
        <div className="space-y-2">
          <div className="h-4 w-32 mx-auto bg-muted rounded animate-pulse" />
          <div className="h-3 w-48 mx-auto bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Page transition wrapper
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const { isAuthenticated, setUser, setIsAuthenticated, setTasks, currentPage, sidebarOpen } = useStore();

  // Check custom auth function
  const checkCustomAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Sync NextAuth session with app state
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser({
        id: (session.user as any).id || '',
        email: session.user.email || '',
        name: session.user.name || null,
        avatar: session.user.image || null,
        role: (session.user as any).role || 'user',
      });
      setIsAuthenticated(true);
    } else if (status === 'unauthenticated') {
      // Also check our custom auth
      checkCustomAuth();
    }
  }, [session, status]);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setTasks([]);
      return;
    }

    const loadTasks = async () => {
      const response = await tasksApi.getAll();
      const payload = response as typeof response & { tasks?: any[] };
      if (response.success && payload.tasks) {
        setTasks(payload.tasks);
      }
    };

    loadTasks().catch(() => setTasks([]));
  }, [isAuthenticated, setTasks]);

  // Show loading skeleton while checking auth
  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated && status !== 'authenticated') {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Render the current page based on state
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'tasks':
        return <TaskManagerPage />;
      case 'planner':
        return <StudyPlannerPage />;
      case 'productivity':
        return <ProductivityPage />;
      case 'insights':
        return <AIInsightsPage />;
      case 'career':
        return <CareerPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-200',
          sidebarOpen ? 'ml-[280px]' : 'ml-[80px]'
        )}
      >
        {/* Navbar */}
        <Navbar />
        
        {/* Page Content */}
        <main className="pt-16 p-6 min-h-screen">
          <PageTransition pageKey={currentPage}>
            <div className="max-w-7xl mx-auto">
              {renderPage()}
            </div>
          </PageTransition>
        </main>
      </div>
      <FloatingAIAssistant />
    </div>
  );
}
