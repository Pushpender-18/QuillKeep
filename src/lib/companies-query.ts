import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';
import { getCompanyIdsMatchingCustomFieldFilters } from '@/lib/company-filters';

export interface CompanyFilterOptions {
  view?: 'active' | 'archived' | 'all';
  scope?: 'my' | 'all';
  q?: string;
  status?: string[];
  state?: string[];
  industry?: string[];
  assigned?: string[];
  priority?: string[];
  location?: string;
  cfFilters?: Array<{
    fieldId: string;
    type: 'text' | 'dropdown' | 'number' | 'date';
    textVal?: string;
    dropdownVals?: string[];
    minNum?: number;
    maxNum?: number;
    fromDate?: string;
    toDate?: string;
  }>;
}

export type RawSearchParams = Record<string, string | string[] | undefined> | URLSearchParams;

/**
 * Normalizes RawSearchParams object or URLSearchParams into a structured filter options object.
 */
export function parseSearchParams(
  raw: RawSearchParams,
  customFieldDefs: any[] = []
): CompanyFilterOptions {
  const getParam = (key: string): string | undefined => {
    if (!raw) return undefined;
    if (raw instanceof URLSearchParams) {
      return raw.get(key) || undefined;
    }
    const val = raw[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const getArrayParam = (key: string): string[] => {
    const val = getParam(key);
    if (!val) return [];
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const viewParam = getParam('view');
  const view = (viewParam === 'archived' ? 'archived' : viewParam === 'all' ? 'all' : 'active') as 'active' | 'archived' | 'all';
  const scope = (getParam('scope') === 'all' ? 'all' : 'my') as 'my' | 'all';
  const q = (getParam('q') || '').trim();
  const status = getArrayParam('status');
  const state = getArrayParam('state');
  const industry = getArrayParam('industry');
  const assigned = getArrayParam('assigned');
  const priority = getArrayParam('priority');
  const location = (getParam('location') || '').trim().toLowerCase();

  const cfFilters: CompanyFilterOptions['cfFilters'] = [];

  customFieldDefs
    .filter((d) => d.isActive)
    .forEach((def) => {
      const defId = String(def.id);
      const dotVal = getParam(`cf.${defId}`);
      if (def.fieldType === 'text') {
        const v = dotVal || getParam(`cf_text_${defId}`);
        if (v) cfFilters.push({ fieldId: defId, type: 'text', textVal: v });
      } else if (def.fieldType === 'dropdown') {
        const v = dotVal || getParam(`cf_drop_${defId}`);
        if (v) cfFilters.push({ fieldId: defId, type: 'dropdown', dropdownVals: v.split(',').filter(Boolean) });
      } else if (def.fieldType === 'number') {
        const min = getParam(`cf_num_min_${defId}`) || (dotVal && !dotVal.includes(',') ? dotVal : dotVal?.split(',')[0]);
        const max = getParam(`cf_num_max_${defId}`) || (dotVal && dotVal.includes(',') ? dotVal.split(',')[1] : undefined);
        if (min || max) {
          cfFilters.push({
            fieldId: defId,
            type: 'number',
            minNum: min ? Number(min) : undefined,
            maxNum: max ? Number(max) : undefined,
          });
        }
      } else if (def.fieldType === 'date') {
        const from = getParam(`cf_date_from_${defId}`) || (dotVal && !dotVal.includes(',') ? dotVal : dotVal?.split(',')[0]);
        const to = getParam(`cf_date_to_${defId}`) || (dotVal && dotVal.includes(',') ? dotVal.split(',')[1] : undefined);
        if (from || to) {
          cfFilters.push({
            fieldId: defId,
            type: 'date',
            fromDate: from,
            toDate: to,
          });
        }
      }
    });

  return {
    view,
    scope,
    q,
    status,
    state,
    industry,
    assigned,
    priority,
    location,
    cfFilters,
  };
}

/**
 * Main SHARED filter function: buildCompanyWhere
 * Processes searchParams & currentUserId and returns matching company IDs pre-filter plus in-memory match predicate.
 */
export async function buildCompanyWhere(
  rawParams: RawSearchParams,
  currentUserId: string,
  optionsOverride?: { overrideView?: 'active' | 'archived' | 'all' }
) {
  const customFieldDefs = await getCustomFieldDefinitions();
  const filters = parseSearchParams(rawParams, customFieldDefs);

  if (optionsOverride?.overrideView) {
    filters.view = optionsOverride.overrideView;
  }

  const cfMatchingCompanyIds = filters.cfFilters && filters.cfFilters.length > 0
    ? await getCompanyIdsMatchingCustomFieldFilters(filters.cfFilters)
    : null;

  return {
    filters,
    cfMatchingCompanyIds,
    isMatch: (company: any, contactsMap: Map<string, any[]>, remarksMap: Map<string, any[]>) => {
      const cId = String(company.id);

      // 1. View filter
      if (filters.view === 'active' && company.isArchived) return false;
      if (filters.view === 'archived' && !company.isArchived) return false;
      // if view === 'all', both active & archived pass

      // 2. Scope filter
      if (filters.scope === 'my') {
        const assignedToId = company.assignedTo ? String(company.assignedTo) : null;
        if (assignedToId !== currentUserId) return false;
      }

      // 3. Search query filter (min 2 chars)
      if (filters.q && filters.q.length >= 2) {
        const qLower = filters.q.toLowerCase();
        const compNameMatch = String(company.name || '').toLowerCase().includes(qLower);

        const compContacts = contactsMap.get(cId) || [];
        const contactMatch = compContacts.some(
          (ct: any) =>
            String(ct.name || '').toLowerCase().includes(qLower) ||
            String(ct.email || '').toLowerCase().includes(qLower) ||
            String(ct.phone || '').toLowerCase().includes(qLower)
        );

        const compRemarks = remarksMap.get(cId) || [];
        const remarkMatch = compRemarks.some((rm: any) =>
          String(rm.body || '').toLowerCase().includes(qLower)
        );

        if (!compNameMatch && !contactMatch && !remarkMatch) return false;
      }

      // 4. Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(String(company.status))) return false;
      }

      // 5. State filter
      if (filters.state && filters.state.length > 0) {
        const stId = company.stateId ? String(company.stateId) : null;
        if (!stId || !filters.state.includes(stId)) return false;
      }

      // 6. Industry filter
      if (filters.industry && filters.industry.length > 0) {
        const indId = company.industryId ? String(company.industryId) : null;
        if (!indId || !filters.industry.includes(indId)) return false;
      }

      // 7. Assigned To filter
      if (filters.assigned && filters.assigned.length > 0 && filters.scope !== 'my') {
        const assignedId = company.assignedTo ? String(company.assignedTo) : 'unassigned';
        if (!filters.assigned.includes(assignedId)) return false;
      }

      // 8. Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(String(company.priority))) return false;
      }

      // 9. Location filter
      if (filters.location) {
        const locStr = String(company.location || '').toLowerCase();
        if (!locStr.includes(filters.location)) return false;
      }

      // 10. Custom Fields SQL matching filter
      if (cfMatchingCompanyIds !== null) {
        if (!cfMatchingCompanyIds.includes(cId)) return false;
      }

      return true;
    },
  };
}

/**
 * Returns all matching companies based on buildCompanyWhere filtering.
 */
export async function getFilteredCompanies(
  rawParams: RawSearchParams,
  currentUserId: string,
  optionsOverride?: { overrideView?: 'active' | 'archived' | 'all' }
) {
  const { isMatch } = await buildCompanyWhere(rawParams, currentUserId, optionsOverride);

  let rawCompanies: any[] = [];
  let rawContacts: any[] = [];
  let rawRemarks: any[] = [];

  try {
    rawCompanies = await prisma.orm.public.Companies.all();
    rawContacts = await prisma.orm.public.Contacts.all();
    rawRemarks = await prisma.orm.public.Remarks.all();
  } catch (err) {
    console.error('[GET_FILTERED_COMPANIES_ERROR]', err);
  }

  const cleanCompanies = convertBigInts(rawCompanies);
  const cleanContacts = convertBigInts(rawContacts);
  const cleanRemarks = convertBigInts(rawRemarks);

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

  return cleanCompanies.filter((c: any) => isMatch(c, contactsMap, remarksMap));
}

/**
 * Returns all matching company IDs (UUIDs) based on buildCompanyWhere filtering.
 */
export async function getFilteredCompanyIds(
  rawParams: RawSearchParams,
  currentUserId: string,
  optionsOverride?: { overrideView?: 'active' | 'archived' | 'all' }
): Promise<{ ids: string[]; totalCount: number; hasMoreThan500: boolean }> {
  const matching = await getFilteredCompanies(rawParams, currentUserId, optionsOverride);
  const totalCount = matching.length;
  const ids = matching.map((c: any) => String(c.id));
  return {
    ids: ids.slice(0, 500),
    totalCount,
    hasMoreThan500: totalCount > 500,
  };
}
