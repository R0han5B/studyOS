"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, PageType } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

const pageHeaders: Record<PageType, { title: string; description: string; icon: React.ElementType }> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Welcome back! Here\'s your learning overview.',
    icon: TrendingUp,
  },
  planner: {
    title: 'Study Planner',
    description: 'AI-powered scheduling for optimal learning.',
    icon: Clock,
  },
  tasks: {
    title: 'Task Manager',
    description: 'Organize and track your study tasks.',
    icon: Sparkles,
  },
  productivity: {
    title: 'Productivity Tracker',
    description: 'Focus sessions and Pomodoro timer.',
    icon: Clock,
  },
  insights: {
    title: 'AI Insights',
    description: 'Personalized recommendations powered by AI.',
    icon: Sparkles,
  },
  analytics: {
    title: 'Analytics',
    description: 'Detailed insights into your learning patterns.',
    icon: TrendingUp,
  },
  settings: {
    title: 'Settings',
    description: 'Customize your experience.',
    icon: Sparkles,
  },
  career: {
    title: 'Career OS',
    description: 'Build skills and move toward your target role.',
    icon: TrendingUp,
  },
};

interface NavbarProps {
  onMenuClick?: () => void;
}

interface NavbarStats {
  streak: number;
  todayHours: number;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, currentPage, notifications, removeNotification, sidebarOpen, setCurrentPage, setSettingsTab } = useStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stats, setStats] = React.useState<NavbarStats>({ streak: 0, todayHours: 0 });
  
  const header = pageHeaders[currentPage];
  const Icon = header.icon;
  const unreadCount = notifications.length;

  React.useEffect(() => {
    if (!user) {
      return;
    }

    const loadStats = async () => {
      try {
        const [analyticsResponse, productivityResponse] = await Promise.all([
          fetch('/api/analytics', { cache: 'no-store' }),
          fetch('/api/productivity?period=day', { cache: 'no-store' }),
        ]);

        const analyticsData = await analyticsResponse.json().catch(() => null);
        const productivityData = await productivityResponse.json().catch(() => null);

        setStats({
          streak: analyticsData?.overview?.currentStreak || 0,
          todayHours: productivityData?.stats?.totalStudyHours || 0,
        });
      } catch (error) {
        console.error('Failed to load navbar stats:', error);
        setStats({ streak: 0, todayHours: 0 });
      }
    };

    loadStats().catch(() => setStats({ streak: 0, todayHours: 0 }));
  }, [user]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16',
        'bg-background/80 backdrop-blur-md border-b border-border',
        'transition-all duration-200',
        sidebarOpen ? 'left-[280px]' : 'left-[80px]'
      )}
      style={{ left: sidebarOpen ? '280px' : '80px', width: `calc(100% - ${sidebarOpen ? '280px' : '80px'})` }}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Page Title */}
        <div className="flex items-center gap-4">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in oklab, var(--accent-100) 80%, transparent)' }}
              >
                <Icon className="w-5 h-5 text-accent-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{header.title}</h1>
                <p className="text-sm text-muted-foreground">{header.description}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <DropdownMenuItem
                        className="flex items-start gap-3 p-3 cursor-pointer"
                        onClick={() => removeNotification(notification.id)}
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                            notification.type === 'success' && 'bg-emerald-500',
                            notification.type === 'error' && 'bg-rose-500',
                            notification.type === 'warning' && 'bg-amber-500',
                            notification.type === 'info' && 'bg-blue-500'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </motion.div>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="text-lg font-bold text-accent-500">{stats.streak}🔥</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-bold text-emerald-500">{stats.todayHours.toFixed(1)}h</p>
            </div>
          </div>

          {/* User Avatar */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback
                      className="text-white"
                      style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
                    >
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsTab('profile');
                    setCurrentPage('settings');
                  }}
                >
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsTab('preferences');
                    setCurrentPage('settings');
                  }}
                >
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-500">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
