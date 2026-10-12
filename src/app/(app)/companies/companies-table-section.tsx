import React from 'react';
import { after } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { buildCompanyWhere } from '@/lib/companies-query';
import { getCustomFieldDefinitionsCached, getIndustries, getRankedIndustries, getStates, getProfiles } from '@/lib/lookups';
import { CompaniesListClient, CompanyListRow } from '@/components/companies/companies-list-client';

interface CompaniesTableSectionProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function CompaniesTableSection({ searchParams }: CompaniesTableSectionProps) {
  const [user, params, cleanIndustries, rankedIndustries, cleanStates, cleanProfiles, customFieldDefinitions] =
    await Promise.all([
      getCurrentUser(),
      searchParams,
      getIndustries(),
      getRankedIndustries(),
      getStates(),
      getProfiles(),
      getCustomFieldDefinitionsCached(),
    ]);

  // Record industry filter use if industry param is present
  const rawIndustryParam = params.industry;
  if (rawIndustryParam) {
    const rawTokens = rawIndustryParam.split(',').map((s) => s.trim()).filter(Boolean);
    const resolvedIds: string[] = [];
    const nameToIdMap = new Map(cleanIndustries.map((ind) => [ind.name.trim().toLowerCase(), ind.id]));

    for (const token of rawTokens) {
      if (UUID_REGEX.test(token)) {
        resolvedIds.push(token);
      } else {
        const idFromName = nameToIdMap.get(token.toLowerCase());
        if (idFromName && UUID_REGEX.test(idFromName)) {
          resolvedIds.push(idFromName);
        }
      }
    }

    const uniqueValidIds = Array.from(new Set(resolvedIds)).slice(0, 20);

    if (uniqueValidIds.length > 0) {
      after(async () => {
        try {
          await prisma.$executeRaw`select record_industry_filter_use(${user.id}::uuid, ${uniqueValidIds}::uuid[])`;
        } catch (err: any) {
          console.error('[RECORD_INDUSTRY_FILTER_USE_ERROR]', err?.code || 'UNKNOWN');
        }
      });
    }
  }


  const view = (params.view === 'archived' ? 'archived' : 'active') as 'active' | 'archived';
  const scope = (params.scope === 'all' ? 'all' : 'my') as 'my' | 'all';
  const sort = (params.sort === 'last_contact' || params.sort === 'priority' ? params.sort : 'name') as
    | 'name'
    | 'last_contact'
    | 'priority';
  const dir = (params.dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = 25;

  let rawCompanies: any[] = [];
  let rawContacts: any[] = [];
  let rawRemarks: any[] = [];

  try {
    rawCompanies = await prisma.orm.public.Companies.all();
    rawContacts = await prisma.orm.public.Contacts.all();
    rawRemarks = await prisma.orm.public.Remarks.all();
  } catch (err) {
    console.error('[COMPANIES_TABLE_SECTION_FETCH_ERROR]', err);
  }

  const cleanContacts = convertBigInts(rawContacts);
  const cleanRemarks = convertBigInts(rawRemarks);

  const industryMap = new Map(cleanIndustries.map((i) => [i.id, i.name]));
  const profileMap = new Map(cleanProfiles.map((p) => [p.id, p]));

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
    <CompaniesListClient
      companies={companies}
      totalCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      currentView={view}
      currentScope={scope}
      currentSort={sort}
      currentDir={dir}
      industries={rankedIndustries}
      states={cleanStates}
      profiles={cleanProfiles}
      customFieldDefinitions={customFieldDefinitions}
      currentUserId={user.id}
    />
  );
}
