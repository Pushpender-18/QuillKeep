import { Suspense } from 'react';
import { CompaniesTableSection } from './companies-table-section';
import { TableSkeleton } from '@/components/ui/skeletons';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const paramsKey = JSON.stringify(resolvedParams);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header - renders instantly */}
      <div className="flex flex-col gap-1 pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Companies</h1>
        <p className="text-xs text-[#8E8E93]">
          Lead pipeline and company directory
        </p>
      </div>

      {/* Streamed Companies Table Section */}
      <Suspense key={paramsKey} fallback={<TableSkeleton rowCount={10} />}>
        <CompaniesTableSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
