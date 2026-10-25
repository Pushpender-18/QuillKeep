'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Option {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className,
  size = 'md',
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center bg-slate-200/80 dark:bg-[#161618] border border-slate-300/70 dark:border-white/10 p-1 rounded-xl shadow-xs select-none',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg font-medium transition-all text-xs sm:text-sm cursor-pointer',
              size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5',
              isActive
                ? 'bg-white dark:bg-[#201F20] text-slate-900 dark:text-white shadow-xs border border-slate-300/80 dark:border-white/[0.08] font-semibold'
                : 'text-slate-600 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
