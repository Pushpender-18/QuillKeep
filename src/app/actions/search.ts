'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { db } from '@/prisma/db';
import { convertBigInts } from '@/lib/utils';

export interface GlobalSearchResultItem {
  id: string;
  resultType: 'company' | 'contact' | 'remark';
  companyId: string;
  companyName: string;
  snippet: string | null;
  // Enriched company metadata
  status?: string;
  isArchived?: boolean;
  assignedToProfile?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export async function globalSearchAction(query: string): Promise<{
  success: boolean;
  results?: {
    companies: GlobalSearchResultItem[];
    contacts: GlobalSearchResultItem[];
    remarks: GlobalSearchResultItem[];
  };
  error?: string;
}> {
  try {
    await getCurrentUser();

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      return {
        success: true,
        results: { companies: [], contacts: [], remarks: [] },
      };
    }

    // Escape \, %, and _ for ILIKE wildcard safety in search_all function
    const escapedQuery = cleanQuery
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

    const searchPattern = `%${escapedQuery}%`;

    // Query search_all using driver query execution
    const drv = (db.runtime() as any).driver;
    const gen = drv.query({
      sql: 'select * from search_all($1::text, $2::boolean, $3::int)',
      params: [searchPattern, true, 30],
    });

    const rawRows: any[] = [];
    for await (const row of gen) {
      rawRows.push(row);
    }

    if (rawRows.length === 0) {
      return {
        success: true,
        results: { companies: [], contacts: [], remarks: [] },
      };
    }

    // Extract unique company IDs
    const companyIds = Array.from(
      new Set(rawRows.map((r: any) => String(r.company_id)).filter(Boolean))
    );

    // Single findMany for company metadata
    let rawCompanies: any[] = [];
    let rawProfiles: any[] = [];
    if (companyIds.length > 0) {
      try {
        const allCompanies = await prisma.orm.public.Companies.all();
        rawCompanies = allCompanies.filter((c: any) => companyIds.includes(String(c.id)));
        rawProfiles = await prisma.orm.public.Profiles.all();
      } catch (err) {
        console.error('[GLOBAL_SEARCH_METADATA_FETCH_ERROR]', err);
      }
    }

    const cleanCompanies = convertBigInts(rawCompanies);
    const cleanProfiles = convertBigInts(rawProfiles);

    const companyMap = new Map(cleanCompanies.map((c: any) => [String(c.id), c]));
    const profileMap = new Map(
      cleanProfiles.map((p: any) => [
        String(p.id),
        { id: String(p.id), fullName: String(p.fullName || ''), email: String(p.email || '') },
      ])
    );

    const companies: GlobalSearchResultItem[] = [];
    const contacts: GlobalSearchResultItem[] = [];
    const remarks: GlobalSearchResultItem[] = [];

    for (const row of rawRows) {
      const type = String(row.result_type) as 'company' | 'contact' | 'remark';
      const cId = String(row.company_id);
      const companyMeta = companyMap.get(cId);

      const assignedId = companyMeta?.assignedTo ? String(companyMeta.assignedTo) : null;
      const assignedProfile = assignedId ? profileMap.get(assignedId) || null : null;

      const item: GlobalSearchResultItem = {
        id: `${type}-${cId}-${Math.random().toString(36).substring(2, 7)}`,
        resultType: type,
        companyId: cId,
        companyName: String(row.company_name || companyMeta?.name || 'Company'),
        snippet: row.snippet ? String(row.snippet) : null,
        status: companyMeta ? String(companyMeta.status) : undefined,
        isArchived: companyMeta ? Boolean(companyMeta.isArchived) : undefined,
        assignedToProfile: assignedProfile,
      };

      if (type === 'company' && companies.length < 5) {
        companies.push(item);
      } else if (type === 'contact' && contacts.length < 5) {
        contacts.push(item);
      } else if (type === 'remark' && remarks.length < 5) {
        remarks.push(item);
      }
    }

    return {
      success: true,
      results: { companies, contacts, remarks },
    };
  } catch (err: any) {
    console.error('[GLOBAL_SEARCH_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Search failed' };
  }
}
