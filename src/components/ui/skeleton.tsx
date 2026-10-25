import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-slate-200 dark:bg-[#161618] animate-skeleton-shimmer border border-slate-300/60 dark:border-white/[0.04]',
        className
      )}
      {...props}
    />
  );
}
