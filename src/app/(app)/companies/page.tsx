import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { CompaniesListClient, CompanyListRow } from '@/components/companies/companies-list-client';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import { buildCompanyWhere } from '@/lib/companies-query';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
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

  const searchQuery = (params.q || '').trim();

  // Load Industries, States, Profiles (including inactive ones so older companies display correctly & filter list labels "(inactive)")
  let rawIndustries: any[] = [];
  let rawStates: any[] = [];
  let rawProfiles: any[] = [];
  let rawCompanies: any[] = [];
  let rawContacts: any[] = [];
  let rawRemarks: any[] = [];

  const customFieldDefinitions = await getCustomFieldDefinitions();

  try {
    rawIndustries = await prisma.orm.public.Industries.all();
    rawStates = await prisma.orm.public.States.all();
    rawProfiles = await prisma.orm.public.Profiles.all();
    rawCompanies = await prisma.orm.public.Companies.all();
    rawContacts = await prisma.orm.public.Contacts.all();
    rawRemarks = await prisma.orm.public.Remarks.all();
  } catch (err) {
    console.error('[COMPANIES_PAGE_FETCH_ERROR]', err);
  }

  const cleanIndustries = convertBigInts(rawIndustries).map((ind: any) => ({
    id: String(ind.id),
    name: String(ind.name),
    isActive: Boolean(ind.isActive),
  }));

  const cleanStates = convertBigInts(rawStates).map((st: any) => ({
    id: String(st.id),
    name: String(st.name),
    isActive: Boolean(st.isActive),
  }));

  const cleanProfiles = convertBigInts(rawProfiles).map((p: any) => ({
    id: String(p.id),
    fullName: String(p.fullName || ''),
    email: String(p.email || ''),
    name: String(p.fullName || p.email || ''),
    isActive: Boolean(p.isActive),
  }));

  const cleanContacts = convertBigInts(rawContacts);
  const cleanRemarks = convertBigInts(rawRemarks);

  // Lookups
  const industryMap = new Map(cleanIndustries.map((i) => [i.id, i.name]));
  const profileMap = new Map(cleanProfiles.map((p) => [p.id, p]));

  // Filter companies using shared filtering logic
  const { isMatch } = await buildCompanyWhere(params, user.id);
  const contactsMap = new Map<string, any[]>();
  cleanContacts.forEach((ct: any) => {
    const cId = String(ct.companyId);
    if (!contactsMap.has(cId)) contactsMap.set(cId, []);
    contactsMap.get(cId)!.push(ct);
  });

  const remarksMap = new Map<string, any[]>();
  cleanRemarks.forEach((rm: any) => {
    const cId = String(rm.companyId);
    if (!remarksMap.has(cId)) remarksMap.set(cId, []);
    remarksMap.get(cId)!.push(rm);
  });

  let filtered = convertBigInts(rawCompanies).filter((c: any) => isMatch(c, contactsMap, remarksMap));

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
      result = weightB - weightA;
    } else if (sort === 'last_contact') {
      const timeA = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const timeB = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      result = timeB - timeA;
    } else {
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
        customFieldDefinitions={customFieldDefinitions}
        currentUserId={user.id}
      />
    </div>
  );
}
