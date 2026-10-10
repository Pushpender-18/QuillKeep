import { Suspense } from 'react';
import { TaskHubFullSection } from './tasks-sections';
import { CalendarSkeleton, ReminderListSkeleton } from '@/components/ui/skeletons';

interface PageProps {
  searchParams: Promise<{
    scope?: string;
    month?: string;
    day?: string;
  }>;
}

export default async function TasksPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const paramsKey = `${resolvedParams.scope || 'my'}-${resolvedParams.month || ''}-${resolvedParams.day || ''}`;

  return (
    <Suspense key={paramsKey} fallback={<TasksLoadingSkeleton />}>
      <TaskHubFullSection searchParams={searchParams} />
    </Suspense>
  );
}

function TasksLoadingSkeleton() {
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
