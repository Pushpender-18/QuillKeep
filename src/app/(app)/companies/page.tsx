import { Suspense } from 'react';
import { CompaniesShell } from './companies-shell';
import { TableBodySkeleton } from '@/components/ui/skeletons';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default function CompaniesPage({ searchParams }: PageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header — renders instantly, never shows a fallback */}
      <div className="flex flex-col gap-1 pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Companies</h1>
        <p className="text-xs text-[#8E8E93]">Lead pipeline and company directory</p>
      </div>

      {/*
       * CompaniesShell (async server component) loads cached lookups + current user,
       * then renders CompaniesControls (the stable controls shell) which renders
       * the keyed <Suspense key={listKey}> around <CompaniesListRows>.
       *
       * This outer Suspense has NO key — so it only shows the fallback on the
       * very first visit. On param changes, the inner keyed boundary fires instead
       * and only the rows + pagination skeleton appears.
       *
       * The loading.tsx for /companies handles the absolute-first navigation to
       * this route (hard nav / initial SSR) and takes precedence over this boundary.
       */}
      <Suspense fallback={<TableBodySkeleton />}>
        <CompaniesShell searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
