'use client';

import { useEffect } from 'react';
import { useStore, AccentColor } from '@/store/useStore';

// Accent color definitions using oklch color space
const accentColors: Record<AccentColor, {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
}> = {
  violet: {
    50: 'oklch(0.985 0.022 293.5)',
    100: 'oklch(0.964 0.045 293.5)',
    200: 'oklch(0.911 0.086 293.5)',
    300: 'oklch(0.828 0.139 293.5)',
    400: 'oklch(0.702 0.183 293.5)',
    500: 'oklch(0.606 0.25 292.5)',
    600: 'oklch(0.541 0.261 293.5)',
  },
  blue: {
    50: 'oklch(0.98 0.02 240)',
    100: 'oklch(0.96 0.04 240)',
    200: 'oklch(0.91 0.08 240)',
    300: 'oklch(0.82 0.12 240)',
    400: 'oklch(0.70 0.16 240)',
    500: 'oklch(0.58 0.20 240)',
    600: 'oklch(0.52 0.22 240)',
  },
  emerald: {
    50: 'oklch(0.985 0.02 160)',
    100: 'oklch(0.96 0.04 160)',
    200: 'oklch(0.91 0.08 160)',
    300: 'oklch(0.82 0.14 160)',
    400: 'oklch(0.70 0.18 160)',
    500: 'oklch(0.60 0.22 160)',
    600: 'oklch(0.52 0.20 160)',
  },
  amber: {
    50: 'oklch(0.985 0.02 80)',
    100: 'oklch(0.96 0.04 80)',
    200: 'oklch(0.91 0.10 80)',
    300: 'oklch(0.82 0.16 80)',
    400: 'oklch(0.74 0.20 80)',
    500: 'oklch(0.68 0.22 80)',
    600: 'oklch(0.60 0.20 60)',
  },
  rose: {
    50: 'oklch(0.985 0.02 10)',
    100: 'oklch(0.96 0.04 10)',
    200: 'oklch(0.91 0.08 10)',
    300: 'oklch(0.82 0.14 10)',
    400: 'oklch(0.70 0.18 10)',
    500: 'oklch(0.60 0.22 10)',
    600: 'oklch(0.52 0.24 10)',
  },
};

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const accentColor = useStore((state) => state.accentColor);

  useEffect(() => {
    const root = document.documentElement;
    const colors = accentColors[accentColor];

    // Set CSS variables for accent color
    root.style.setProperty('--accent-50', colors[50]);
    root.style.setProperty('--accent-100', colors[100]);
    root.style.setProperty('--accent-200', colors[200]);
    root.style.setProperty('--accent-300', colors[300]);
    root.style.setProperty('--accent-400', colors[400]);
    root.style.setProperty('--accent-500', colors[500]);
    root.style.setProperty('--accent-600', colors[600]);
    root.style.setProperty('--primary', colors[500]);
    root.style.setProperty('--primary-foreground', 'oklch(0.985 0 0)');
    root.style.setProperty('--sidebar-primary', colors[500]);
    root.style.setProperty('--sidebar-ring', colors[500]);
    root.style.setProperty('--chart-1', colors[500]);
    root.style.setProperty('--chart-4', colors[300]);
    root.style.setProperty('--accent', colors[100]);
    root.style.setProperty('--accent-foreground', 'oklch(0.205 0 0)');

    // Update ring color to match accent
    root.style.setProperty('--ring', colors[500]);
  }, [accentColor]);

  return <>{children}</>;
}
