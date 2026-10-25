'use client';

import * as React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'compact' | 'segmented';
}

export function ThemeToggle({ className, variant = 'button' }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/[0.06] text-xs select-none',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer',
            !isDark
              ? 'bg-white text-[#0A84FF] shadow-xs font-semibold'
              : 'text-slate-500 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white'
          )}
          title="Light theme"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer',
            isDark
              ? 'bg-[#0A84FF]/20 text-[#0A84FF] shadow-xs font-semibold'
              : 'text-slate-500 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white'
          )}
          title="Dark theme"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'group relative p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center select-none outline-none',
        'bg-white dark:bg-[#161618] border border-slate-300 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-white/20 text-slate-600 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white shadow-xs dark:shadow-sm',
        'theme-toggle-btn',
        className
      )}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (shown when dark to suggest switching to light, or in light) */}
        <Sun
          className={cn(
            'w-4 h-4 text-amber-500 transition-all duration-300 absolute inset-0 transform',
            isDark
              ? 'opacity-0 -rotate-90 scale-50 pointer-events-none'
              : 'opacity-100 rotate-0 scale-100'
          )}
        />
        {/* Moon Icon */}
        <Moon
          className={cn(
            'w-4 h-4 text-indigo-400 transition-all duration-300 absolute inset-0 transform',
            isDark
              ? 'opacity-100 rotate-0 scale-100 text-[#0A84FF]'
              : 'opacity-0 rotate-90 scale-50 pointer-events-none'
          )}
        />
      </div>

      <span className="sr-only">
        {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      </span>
    </button>
  );
}
