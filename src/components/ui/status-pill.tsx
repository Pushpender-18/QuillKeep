import * as React from 'react';
import { cn } from '@/lib/utils';

export type LeadStatus = 'new' | 'contacted' | 'not_interested' | 'contact_later' | 'meeting_scheduled';

export interface StatusPillProps {
  status: LeadStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; colorClass: string; dotClass: string }> = {
  new: {
    label: 'New Lead',
    colorClass: 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30',
    dotClass: 'bg-[#30D158]',
  },
  contacted: {
    label: 'Contacted',
    colorClass: 'bg-[#0A84FF]/15 text-[#0A84FF] border-[#0A84FF]/30',
    dotClass: 'bg-[#0A84FF]',
  },
  meeting_scheduled: {
    label: 'Meeting Scheduled',
    colorClass: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30',
    dotClass: 'bg-[#FF9F0A]',
  },
  contact_later: {
    label: 'Contact Later',
    colorClass: 'bg-[#FFD60A]/15 text-[#FFD60A] border-[#FFD60A]/30',
    dotClass: 'bg-[#FFD60A]',
  },
  not_interested: {
    label: 'Not Interested',
    colorClass: 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30',
    dotClass: 'bg-[#FF453A]',
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, className }) => {
  const config = statusConfig[status] || {
    label: status.replace(/_/g, ' '),
    colorClass: 'bg-white/10 text-white/80 border-white/20',
    dotClass: 'bg-white/60',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-tight transition-all',
        config.colorClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
      <span className="capitalize">{config.label}</span>
    </span>
  );
};
