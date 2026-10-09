import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { CompaniesListClient, CompanyListRow } from '@/components/companies/companies-list-client';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import { getCompanyIdsMatchingCustomFieldFilters } from '@/lib/company-filters';

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

  // Process Custom Field Filters from URL params
  const cfFilters: Array<{
    fieldId: string;
    type: 'text' | 'dropdown' | 'number' | 'date';
    textVal?: string;
    dropdownVals?: string[];
    minNum?: number;
    maxNum?: number;
    fromDate?: string;
    toDate?: string;
  }> = [];

  customFieldDefinitions
    .filter((d) => d.isActive)
    .forEach((def) => {
      if (def.fieldType === 'text') {
        const v = params[`cf_text_${def.id}`];
        if (v) cfFilters.push({ fieldId: def.id, type: 'text', textVal: v });
      } else if (def.fieldType === 'dropdown') {
        const v = params[`cf_drop_${def.id}`];
        if (v) cfFilters.push({ fieldId: def.id, type: 'dropdown', dropdownVals: v.split(',').filter(Boolean) });
      } else if (def.fieldType === 'number') {
        const min = params[`cf_num_min_${def.id}`];
        const max = params[`cf_num_max_${def.id}`];
        if (min || max) {
          cfFilters.push({
            fieldId: def.id,
            type: 'number',
            minNum: min ? Number(min) : undefined,
            maxNum: max ? Number(max) : undefined,
          });
        }
      } else if (def.fieldType === 'date') {
        const from = params[`cf_date_from_${def.id}`];
        const to = params[`cf_date_to_${def.id}`];
        if (from || to) {
          cfFilters.push({
            fieldId: def.id,
            type: 'date',
            fromDate: from,
            toDate: to,
          });
        }
      }
    });

  // Query database via parameterized SQL for matching custom field company IDs if active
  const cfMatchingCompanyIds = await getCompanyIdsMatchingCustomFieldFilters(cfFilters);

  // Extract pill filters
  const selectedStatuses = (params.status || '').split(',').filter(Boolean);
  const selectedStates = (params.state || '').split(',').filter(Boolean);
  const selectedIndustries = (params.industry || '').split(',').filter(Boolean);
  const selectedAssigned = (params.assigned || '').split(',').filter(Boolean);
  const selectedPriorities = (params.priority || '').split(',').filter(Boolean);
  const locationParam = (params.location || '').trim().toLowerCase();

  // Filter companies
  let filtered = convertBigInts(rawCompanies).filter((c: any) => {
    const cId = String(c.id);

    // 1. View filter
    const matchesView = view === 'archived' ? Boolean(c.isArchived) : !c.isArchived;
    if (!matchesView) return false;

    // 2. Scope filter
    if (scope === 'my') {
      const assignedToId = c.assignedTo ? String(c.assignedTo) : null;
      if (assignedToId !== user.id) return false;
    }

    // 3. Search query filter (q min 2 chars): matches name, contact name/email/phone, remark body case-insensitive
    if (searchQuery.length >= 2) {
      const qLower = searchQuery.toLowerCase();
      const compNameMatch = String(c.name).toLowerCase().includes(qLower);

      const compContacts = cleanContacts.filter((ct: any) => String(ct.companyId) === cId);
      const contactMatch = compContacts.some(
        (ct: any) =>
          String(ct.name || '').toLowerCase().includes(qLower) ||
          String(ct.email || '').toLowerCase().includes(qLower) ||
          String(ct.phone || '').toLowerCase().includes(qLower)
      );

      const compRemarks = cleanRemarks.filter((rm: any) => String(rm.companyId) === cId);
      const remarkMatch = compRemarks.some((rm: any) =>
        String(rm.body || '').toLowerCase().includes(qLower)
      );

      if (!compNameMatch && !contactMatch && !remarkMatch) {
        return false;
      }
    }

    // 4. Status filter (OR within status pill)
    if (selectedStatuses.length > 0) {
      if (!selectedStatuses.includes(String(c.status))) return false;
    }

    // 5. State filter (OR within state pill)
    if (selectedStates.length > 0) {
      const stId = c.stateId ? String(c.stateId) : null;
      if (!stId || !selectedStates.includes(stId)) return false;
    }

    // 6. Industry filter (OR within industry pill)
    if (selectedIndustries.length > 0) {
      const indId = c.industryId ? String(c.industryId) : null;
      if (!indId || !selectedIndustries.includes(indId)) return false;
    }

    // 7. Assigned To filter (OR within assigned pill)
    if (selectedAssigned.length > 0 && scope !== 'my') {
      const assignedId = c.assignedTo ? String(c.assignedTo) : 'unassigned';
      if (!selectedAssigned.includes(assignedId)) return false;
    }

    // 8. Priority filter (OR within priority pill)
    if (selectedPriorities.length > 0) {
      if (!selectedPriorities.includes(String(c.priority))) return false;
    }

    // 9. Location filter (contains)
    if (locationParam) {
      const locStr = String(c.location || '').toLowerCase();
      if (!locStr.includes(locationParam)) return false;
    }

    // 10. Custom Fields SQL matching filter (AND across custom fields)
    if (cfMatchingCompanyIds !== null) {
      if (!cfMatchingCompanyIds.includes(cId)) return false;
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
