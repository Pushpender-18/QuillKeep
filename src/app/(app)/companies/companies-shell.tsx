import React, { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
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
 * Async server component — loads ONLY cached lookups + current user.
 * Does NOT await searchParams itself (it just passes the Promise down).
 * Renders the controls shell (toggles, search, filter pills, buttons) immediately,
 * then renders the keyed <Suspense> for the list rows as a child slot.
 *
 * The keyed boundary is formed here, using a fixed-order serialization of all
 * list-affecting params. The key MUST include every param that changes the list:
 *   view, scope, q, status, state, industry, assigned, priority, location,
 *   all cf_* params, sort, dir, page.
 * Non-list params (e.g. ?new=1) are intentionally excluded.
 */
export async function CompaniesShell({ searchParams }: CompaniesShellProps) {
  const [user, rankedIndustries, cleanStates, cleanProfiles, customFieldDefinitions] =
    await Promise.all([
      getCurrentUser(),
      getRankedIndustries(),
      getStates(),
      getProfiles(),
      getCustomFieldDefinitionsCached(),
    ]);

  // Await params only to derive the Suspense key — the heavy data fetching
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
    <CompaniesControls
      rankedIndustries={rankedIndustries}
      states={cleanStates}
      profiles={cleanProfiles}
      customFieldDefinitions={customFieldDefinitions}
      currentUserId={user.id}
      listSlot={
        <Suspense key={listKey} fallback={<TableBodySkeleton />}>
          <CompaniesListRows searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}
