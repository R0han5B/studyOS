"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Timer,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  BookOpen,
  User,
  BriefcaseBusiness,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, PageType } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and quick stats',
  },
  {
    id: 'planner',
    label: 'Study Planner',
    icon: Calendar,
    description: 'AI-powered study scheduling',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    description: 'Manage your tasks',
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: Timer,
    description: 'Pomodoro timer & tracking',
  },
  {
    id: 'insights',
    label: 'AI Insights',
    icon: Sparkles,
    description: 'AI-powered recommendations',
  },
  {
    id: 'career',
    label: 'Career OS',
    icon: BriefcaseBusiness,
    description: 'Skills, goals, and career roadmaps',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Detailed performance analytics',
  },
];

export function Sidebar() {
  const { user, currentPage, setCurrentPage, setSettingsTab, sidebarOpen, setSidebarOpen, logout } = useStore();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      // Sign out from NextAuth
      await signOut({ redirect: false });
      // Call custom logout API
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear local state
      logout();
      // Force page reload to reset all state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 80,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 z-40 h-screen',
          'flex flex-col',
          'bg-background border-r border-border',
          'transition-colors duration-200'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <motion.div
            className="flex items-center gap-3"
            animate={{ opacity: 1 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <h1
                    className="text-lg font-bold bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-500), var(--accent-600))' }}
                  >
                    studyOS
                  </h1>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Learning & Career OS
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => setCurrentPage(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                      'transition-all duration-200',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive && 'border'
                    )}
                    style={
                      isActive
                        ? {
                            background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent-100) 80%, transparent), color-mix(in oklab, var(--accent-200) 70%, transparent))',
                            color: 'var(--accent-600)',
                            borderColor: 'color-mix(in oklab, var(--accent-300) 70%, transparent)',
                          }
                        : undefined
                    }
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive && 'text-accent-500'
                    )} />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className={cn(
                            'text-sm font-medium overflow-hidden whitespace-nowrap',
                            isActive && 'text-accent-600'
                          )}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && sidebarOpen && (
                      <motion.div
                        layoutId="activeNav"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500"
                      />
                    )}
                  </motion.button>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right" className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 py-4 border-t border-border space-y-2">
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => {
                  setSettingsTab('profile');
                  setCurrentPage('settings');
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  currentPage === 'settings' && 'border'
                )}
                style={
                  currentPage === 'settings'
                    ? {
                        background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent-100) 80%, transparent), color-mix(in oklab, var(--accent-200) 70%, transparent))',
                        color: 'var(--accent-600)',
                        borderColor: 'color-mix(in oklab, var(--accent-300) 70%, transparent)',
                      }
                    : undefined
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium overflow-hidden whitespace-nowrap"
                    >
                      Settings
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right">
                <span>Settings & Preferences</span>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={toggleTheme}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <Sun className="w-5 h-5 flex-shrink-0" />
                )}
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium overflow-hidden whitespace-nowrap"
                    >
                      {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right">
                <span>Toggle Theme</span>
              </TooltipContent>
            )}
          </Tooltip>

          {/* User Profile */}
          {user && (
            <div className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              'bg-muted/50'
            )}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback
                  className="text-white text-xs"
                  style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
                >
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  'text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium overflow-hidden whitespace-nowrap"
                    >
                      Logout
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right">
                <span>Logout</span>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Toggle Button */}
        <motion.button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'absolute -right-3 top-20',
            'w-6 h-6 rounded-full',
            'bg-background border border-border',
            'flex items-center justify-center',
            'shadow-sm hover:shadow-md',
            'transition-all duration-200',
            'hover:bg-accent'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </motion.button>
      </motion.aside>
    </TooltipProvider>
  );
}
