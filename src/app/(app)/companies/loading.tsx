import React from 'react';
import { TableSkeleton } from '@/components/ui/skeletons';

export default function CompaniesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 pb-4 border-b border-white/[0.08]">
        <div className="h-7 w-40 bg-[#161618] rounded animate-skeleton-shimmer" />
        <div className="h-3 w-64 bg-[#161618] rounded animate-skeleton-shimmer" />
      </div>
      <TableSkeleton rowCount={10} />
    </div>
  );
}
