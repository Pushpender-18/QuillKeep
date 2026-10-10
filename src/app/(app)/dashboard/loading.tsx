import React from 'react';
import {
  StatCardSkeleton,
  GaugeSkeleton,
  ChartSkeleton,
  ReminderListSkeleton,
} from '@/components/ui/skeletons';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="h-16 w-full bg-[#161618] border border-white/[0.08] rounded-2xl animate-skeleton-shimmer" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <GaugeSkeleton />
        </div>
        <div className="lg:col-span-8">
          <ChartSkeleton />
        </div>
      </div>
      <ReminderListSkeleton />
    </div>
  );
}
