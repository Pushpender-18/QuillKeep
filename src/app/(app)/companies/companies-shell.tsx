import React, { Suspense } from 'react';
import {
  getRankedIndustries,
  getStates,
  getProfiles,
  getCustomFieldDefinitionsCached,
} from '@/lib/lookups';
import { CompaniesControls } from '@/components/companies/companies-controls';
import { CompaniesListRows } from './companies-list-rows';
import { TableBodySkeleton } from '@/components/ui/skeletons';

interface CompaniesShellProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * Async server component — loads ONLY cached in-memory lookups (<5ms).
 * Does NOT await getCurrentUser() or any network-touching resource.
 * Renders the page title, the controls shell, and the keyed list Suspense immediately.
 *
 * The keyed boundary is formed here, using a fixed-order serialization of all
 * list-affecting params. The key MUST include every param that changes the list:
 *   view, scope, q, status, state, industry, assigned, priority, location,
 *   all cf_* params, sort, dir, page.
 * Non-list params (e.g. ?new=1) are intentionally excluded.
 */
export async function CompaniesShell({ searchParams }: CompaniesShellProps) {
  const [rankedIndustries, cleanStates, cleanProfiles, customFieldDefinitions] =
    await Promise.all([
      getRankedIndustries(),
      getStates(),
      getProfiles(),
      getCustomFieldDefinitionsCached(),
    ]);

  // Await params only to derive the Suspense key (in-memory, <0.5ms) — the heavy data fetching
  // happens inside <CompaniesListRows> which is inside the keyed boundary.
  const params = await searchParams;

  // Build a stable, fixed-order key from all list-affecting params.
  // Params that are NOT list-affecting (e.g. "new") are omitted so they
  // don't trigger a list skeleton unnecessarily.
  const listAffectingKeys = [
    'view',
    'scope',
    'q',
    'status',
    'state',
    'industry',
    'assigned',
    'priority',
    'location',
    'sort',
    'dir',
    'page',
    // custom field params — collect any cf_* keys from the current params
    ...Object.keys(params)
      .filter((k) => k.startsWith('cf_'))
      .sort(),
  ];

  const listKey = listAffectingKeys
    .map((k) => `${k}=${params[k] ?? ''}`)
    .join('&');

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header — returned immediately by the shell without network wait */}
      <div className="flex flex-col gap-1 pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Companies</h1>
        <p className="text-xs text-[#8E8E93]">Lead pipeline and company directory</p>
      </div>

      {/* Controls shell (outside every keyed boundary) */}
      <CompaniesControls
        rankedIndustries={rankedIndustries}
        states={cleanStates}
        profiles={cleanProfiles}
        customFieldDefinitions={customFieldDefinitions}
        listSlot={
          <Suspense key={listKey} fallback={<TableBodySkeleton />}>
            <CompaniesListRows searchParams={searchParams} />
          </Suspense>
        }
      />
    </div>
  );
}
