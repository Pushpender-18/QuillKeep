import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CardSkeleton, TimelineSkeleton, RemarksSkeleton, ReminderListSkeleton } from '@/components/ui/skeletons';

export default function CompanyDetailLoading() {
  return (
    <div className="flex flex-col gap-6 pb-16">
      <div>
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Companies</span>
        </Link>
      </div>

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
    </div>
  );
}
