import React from 'react';
import { CalendarSkeleton, ReminderListSkeleton } from '@/components/ui/skeletons';

export default function TasksLoading() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="h-16 w-full bg-[#161618] border border-white/[0.08] rounded-2xl animate-skeleton-shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4">
          <CalendarSkeleton />
        </div>
        <div className="lg:col-span-8">
          <ReminderListSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
