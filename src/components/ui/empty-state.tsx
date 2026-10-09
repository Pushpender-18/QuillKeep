import * as React from 'react';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full bg-[#161618] border border-white/[0.08] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#0A84FF] mb-4 shadow-inner">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-white tracking-tight mb-1">{title}</h3>
      {description && <p className="text-sm text-[#8E8E93] max-w-md mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
