"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Clock,
  Sun,
  Moon,
  Monitor,
  Check,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { AccentColor } from '@/store/useStore';

interface NotificationPrefs {
  emailStudyReminders: boolean;
  emailWeeklyReport: boolean;
  pushTaskReminders: boolean;
  pushAchievements: boolean;
  soundEffects: boolean;
}

interface ProfileResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    role: string;
    timezone: string;
    theme: string;
    notificationPrefs?: NotificationPrefs | null;
  };
  error?: string;
}

const defaultNotifications: NotificationPrefs = {
  emailStudyReminders: false,
  emailWeeklyReport: false,
  pushTaskReminders: false,
  pushAchievements: false,
  soundEffects: false,
};

export function SettingsPage() {
  const {
    user,
    setUser,
    logout,
    pomodoroSettings,
    setPomodoroSettings,
    addNotification,
    accentColor,
    setAccentColor,
    settingsTab,
    setSettingsTab,
  } = useStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    timezone: 'UTC',
  });

  const [notifications, setNotifications] = useState<NotificationPrefs>(defaultNotifications);

  const [preferences, setPreferences] = useState({
    pomodoroLength: pomodoroSettings.focusDuration,
    shortBreakLength: pomodoroSettings.shortBreak,
    longBreakLength: pomodoroSettings.longBreak,
    dailyGoal: pomodoroSettings.dailyGoal,
    weeklyGoal: pomodoroSettings.weeklyGoal,
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const result: ProfileResponse = await response.json().catch(() => ({ success: false, error: 'Failed to load profile' }));

        if (!result.success || !result.user) {
          return;
        }

        setProfile({
          name: result.user.name || '',
          email: result.user.email,
          timezone: result.user.timezone || 'UTC',
        });
        setNotifications({ ...defaultNotifications, ...(result.user.notificationPrefs || {}) });
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    loadProfile().catch(() => undefined);
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const result: ProfileResponse = await response.json().catch(() => ({ success: false, error: 'Failed to save profile' }));

      if (!response.ok || !result.success || !result.user) {
        throw new Error(result.error || 'Failed to save profile');
      }

      setUser({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.avatar,
        role: result.user.role,
      });

      toast({
        title: 'Profile saved',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save your profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationPrefs: notifications }),
      });
      const result: ProfileResponse = await response.json().catch(() => ({ success: false, error: 'Failed to save notifications' }));

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save notifications');
      }

      toast({
        title: 'Notifications saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save notification settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      setPomodoroSettings({
        focusDuration: preferences.pomodoroLength,
        shortBreak: preferences.shortBreakLength,
        longBreak: preferences.longBreakLength,
        dailyGoal: preferences.dailyGoal,
        weeklyGoal: preferences.weeklyGoal,
      });

      addNotification({
        type: 'success',
        message: 'Pomodoro settings updated successfully!',
      });

      toast({
        title: 'Preferences saved',
        description: 'Your Pomodoro settings have been updated.',
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Delete your account permanently? This will remove all of your tasks, sessions, schedules, and analytics data.');
    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await signOut({ redirect: false });

      const response = await fetch('/api/profile', {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => ({ success: false, error: 'Failed to delete account' }));

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      logout();
      window.location.href = '/';
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete your account.',
        variant: 'destructive',
      });
      setIsDeletingAccount(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          Settings
        </h2>
        <p className="text-muted-foreground">Manage your profile, preferences, and account data</p>
      </div>

      <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as typeof settingsTab)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details for the current user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{profile.name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <Badge variant="secondary" className="mt-2 capitalize">
                    {user?.role || 'user'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profile.email} readOnly disabled className="cursor-not-allowed bg-muted" />
                  <p className="text-xs text-muted-foreground">Email is tied to your account and cannot be edited.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => setProfile({ ...profile, timezone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveProfile} className="gap-2" disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>Account security status for the current user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-border">
                <p className="font-medium">Authentication</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is protected by the configured sign-in method for this user session.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-500/50">
            <CardHeader>
              <CardTitle className="text-rose-500">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for the current account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all user-specific data.</p>
                </div>
                <Button variant="destructive" className="gap-2" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                  {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage notification preferences stored for this user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: 'emailStudyReminders', label: 'Study Reminders', description: 'Get reminded about your scheduled study sessions' },
                { id: 'emailWeeklyReport', label: 'Weekly Report', description: 'Receive a summary of your weekly progress' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.id as keyof NotificationPrefs]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.id]: checked })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Control in-app reminders and achievement updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: 'pushTaskReminders', label: 'Task Reminders', description: 'Get notified about upcoming task deadlines' },
                { id: 'pushAchievements', label: 'Achievements', description: 'Celebrate when you reach milestones' },
                { id: 'soundEffects', label: 'Sound Effects', description: 'Play sounds for timer and feedback events' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.id as keyof NotificationPrefs]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.id]: checked })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button onClick={handleSaveNotifications} className="gap-2" disabled={isSavingNotifications}>
            {isSavingNotifications ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Notification Settings
          </Button>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Choose your preferred theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = theme === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3',
                        isSelected ? 'border-accent-500' : 'border-border hover:border-accent-500/50'
                      )}
                      style={isSelected ? { backgroundColor: 'color-mix(in oklab, var(--accent-100) 60%, transparent)' } : undefined}
                    >
                      <div
                        className={cn('w-12 h-12 rounded-lg flex items-center justify-center', isSelected ? 'text-white' : 'bg-muted')}
                        style={isSelected ? { backgroundColor: 'var(--accent-500)' } : undefined}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium">{option.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-accent-500" />}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accent Color</CardTitle>
              <CardDescription>Choose your accent color</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {[
                  { name: 'violet' as AccentColor, label: 'Violet', bgClass: 'bg-violet-500' },
                  { name: 'blue' as AccentColor, label: 'Blue', bgClass: 'bg-blue-500' },
                  { name: 'emerald' as AccentColor, label: 'Emerald', bgClass: 'bg-emerald-500' },
                  { name: 'amber' as AccentColor, label: 'Amber', bgClass: 'bg-amber-500' },
                  { name: 'rose' as AccentColor, label: 'Rose', bgClass: 'bg-rose-500' },
                ].map((color) => (
                  <motion.button
                    key={color.name}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAccentColor(color.name)}
                    className={cn(
                      'w-10 h-10 rounded-full transition-all',
                      color.bgClass,
                      accentColor === color.name && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                    )}
                    title={color.label}
                    aria-label={`Set accent color to ${color.label}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Current: <span className="font-medium capitalize">{accentColor}</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pomodoro Settings</CardTitle>
              <CardDescription>Customize your focus timer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Focus Duration (min)</Label>
                  <Select value={preferences.pomodoroLength.toString()} onValueChange={(v) => setPreferences({ ...preferences, pomodoroLength: parseInt(v, 10) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="25">25 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Short Break (min)</Label>
                  <Select value={preferences.shortBreakLength.toString()} onValueChange={(v) => setPreferences({ ...preferences, shortBreakLength: parseInt(v, 10) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Long Break (min)</Label>
                  <Select value={preferences.longBreakLength.toString()} onValueChange={(v) => setPreferences({ ...preferences, longBreakLength: parseInt(v, 10) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Goals</CardTitle>
              <CardDescription>Set your daily and weekly study targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Daily Goal (hours)</Label>
                  <Select value={preferences.dailyGoal.toString()} onValueChange={(v) => setPreferences({ ...preferences, dailyGoal: parseInt(v, 10) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Weekly Goal (hours)</Label>
                  <Select value={preferences.weeklyGoal.toString()} onValueChange={(v) => setPreferences({ ...preferences, weeklyGoal: parseInt(v, 10) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14">14 hours</SelectItem>
                      <SelectItem value="21">21 hours</SelectItem>
                      <SelectItem value="28">28 hours</SelectItem>
                      <SelectItem value="35">35 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSavePreferences} className="gap-2" disabled={isSavingPreferences}>
            {isSavingPreferences ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Preferences
          </Button>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
