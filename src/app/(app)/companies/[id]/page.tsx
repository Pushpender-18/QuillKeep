import { Suspense } from 'react';
import { CompanyDetailFullView } from './sections';
import { CardSkeleton, TimelineSkeleton, RemarksSkeleton, ReminderListSkeleton } from '@/components/ui/skeletons';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Streamed Detail Content */}
      <Suspense fallback={<CompanyDetailLoadingSkeleton />}>
        <CompanyDetailFullView id={id} />
      </Suspense>
    </div>
  );
}

function CompanyDetailLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <CardSkeleton className="h-28" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CardSkeleton className="h-64" />
          <CardSkeleton className="h-64" />
          <ReminderListSkeleton count={3} />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-6">
          <TimelineSkeleton />
          <RemarksSkeleton />
        </div>
      </div>
    </div>
  );
}
