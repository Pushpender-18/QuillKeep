import * as React from 'react';
import { cn } from '@/lib/utils';

export type PriorityLevel = 'low' | 'medium' | 'high';

export interface PriorityTagProps {
  priority: PriorityLevel | string;
  className?: string;
}

const priorityConfig: Record<string, { label: string; badgeClass: string }> = {
  high: {
    label: 'High',
    badgeClass: 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30',
  },
};

export const PriorityTag: React.FC<PriorityTagProps> = ({ priority, className }) => {
  const config = priorityConfig[priority.toLowerCase()] || {
    label: priority,
    badgeClass: 'bg-white/10 text-[#8E8E93] border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border',
        config.badgeClass,
        className
      )}
    >
      {config.label}
    </span>
  );
};
