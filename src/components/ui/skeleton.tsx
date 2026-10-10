import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-[#161618] animate-skeleton-shimmer border border-white/[0.04]',
        className
      )}
      {...props}
    />
  );
}
