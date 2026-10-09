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
        'inline-flex items-center bg-[#161618] border border-white/10 p-1 rounded-xl shadow-sm select-none',
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
              'rounded-lg font-medium transition-all text-xs sm:text-sm',
              size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5',
              isActive
                ? 'bg-[#201F20] text-white shadow-sm border border-white/[0.08]'
                : 'text-[#8E8E93] hover:text-white'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
