import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { CompaniesListClient, CompanyListRow } from '@/components/companies/companies-list-client';

interface PageProps {
  searchParams: Promise<{
    view?: string;
    scope?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}

export default async function CompaniesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const view = (params.view === 'archived' ? 'archived' : 'active') as 'active' | 'archived';
  const scope = (params.scope === 'all' ? 'all' : 'my') as 'my' | 'all';
  const sort = (params.sort === 'last_contact' || params.sort === 'priority' ? params.sort : 'name') as 'name' | 'last_contact' | 'priority';
  const dir = (params.dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = 25;

  // Load active metadata: Industries, States, Profiles
  let rawIndustries: any[] = [];
  let rawStates: any[] = [];
  let rawProfiles: any[] = [];
  let rawCompanies: any[] = [];

  try {
    rawIndustries = await prisma.orm.public.Industries.where({ isActive: true }).all();
    rawStates = await prisma.orm.public.States.where({ isActive: true }).all();
    rawProfiles = await prisma.orm.public.Profiles.where({ isActive: true }).all();
    rawCompanies = await prisma.orm.public.Companies.all();
  } catch (err) {
    console.error('[COMPANIES_PAGE_FETCH_ERROR]', err);
  }

  const cleanIndustries = convertBigInts(rawIndustries).map((ind: any) => ({
    id: String(ind.id),
    name: String(ind.name),
  }));

  const cleanStates = convertBigInts(rawStates).map((st: any) => ({
    id: String(st.id),
    name: String(st.name),
  }));

  const cleanProfiles = convertBigInts(rawProfiles).map((p: any) => ({
    id: String(p.id),
    fullName: String(p.fullName || ''),
    email: String(p.email || ''),
  }));

  // Create lookups
  const industryMap = new Map(cleanIndustries.map((i) => [i.id, i.name]));
  const profileMap = new Map(cleanProfiles.map((p) => [p.id, p]));

  // Filter companies according to view & scope
  let filtered = convertBigInts(rawCompanies).filter((c: any) => {
    // View filter
    const matchesView = view === 'archived' ? Boolean(c.isArchived) : !c.isArchived;
    if (!matchesView) return false;

    // Scope filter (My Leads vs All Team)
    if (scope === 'my') {
      const assignedToId = c.assignedTo ? String(c.assignedTo) : null;
      if (assignedToId !== user.id) return false;
    }

    return true;
  });

  // Sorting
  const priorityWeight: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  filtered.sort((a: any, b: any) => {
    let result = 0;
    if (sort === 'priority') {
      const weightA = priorityWeight[String(a.priority).toLowerCase()] || 0;
      const weightB = priorityWeight[String(b.priority).toLowerCase()] || 0;
      result = weightB - weightA; // High to Low by default
    } else if (sort === 'last_contact') {
      const timeA = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const timeB = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      result = timeB - timeA; // Most recent first
    } else {
      // Name sorting
      const nameA = String(a.name).trim().toLowerCase();
      const nameB = String(b.name).trim().toLowerCase();
      result = nameA.localeCompare(nameB);
    }

    return dir === 'desc' ? -result : result;
  });

  // Server-side pagination (25 per page)
  const totalCount = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);

  const companies: CompanyListRow[] = paginatedRows.map((c: any) => {
    const assignedId = c.assignedTo ? String(c.assignedTo) : null;
    const assignedProfile = assignedId ? profileMap.get(assignedId) || null : null;
    const indId = c.industryId ? String(c.industryId) : null;

    return {
      id: String(c.id),
      name: String(c.name),
      industryName: indId ? industryMap.get(indId) || null : null,
      location: c.location ? String(c.location) : null,
      status: String(c.status),
      priority: String(c.priority),
      assignedToProfile: assignedProfile,
      lastContactedAt: c.lastContactedAt ? String(c.lastContactedAt) : null,
      isArchived: Boolean(c.isArchived),
      archiveReason: c.archiveReason ? String(c.archiveReason) : null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Companies</h1>
        <p className="text-xs text-[#8E8E93]">
          Lead pipeline and company directory
        </p>
      </div>

      {/* Main Companies List Client View */}
      <CompaniesListClient
        companies={companies}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        currentView={view}
        currentScope={scope}
        currentSort={sort}
        currentDir={dir}
        industries={cleanIndustries}
        states={cleanStates}
        profiles={cleanProfiles}
        currentUserId={user.id}
      />
    </div>
  );
}
