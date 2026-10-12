import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { getOpenReminders } from '@/lib/reminders';
import { getRemarksForCompany } from '@/lib/remarks';
import { getCustomFieldDefinitionsCached, getIndustries, getStates, getProfiles } from '@/lib/lookups';
import { CompanyDetailClient } from '@/components/companies/company-detail-client';

interface DetailSectionProps {
  id: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function CompanyDetailHeaderSection({ id }: DetailSectionProps) {
  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const [user, rawCompany, cleanProfiles, customFieldDefinitions] = await Promise.all([
    getCurrentUser(),
    prisma.orm.public.Companies.where({ id }).first(),
    getProfiles(),
    getCustomFieldDefinitionsCached(),
  ]);

  if (!rawCompany) notFound();

  const cleanCompany = convertBigInts(rawCompany);
  return null; // Used in unified client view or separate client components
}

export async function CompanyDetailFullView({ id }: { id: string }) {
  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const [
    user,
    rawCompany,
    rawContacts,
    rawHistoryLogs,
    cleanIndustries,
    cleanStates,
    cleanProfiles,
    customFieldDefinitions,
  ] = await Promise.all([
    getCurrentUser(),
    prisma.orm.public.Companies.where({ id }).first(),
    prisma.orm.public.Contacts.where({ companyId: id }).all(),
    prisma.orm.public.HistoryLog.where({ companyId: id }).all(),
    getIndustries(),
    getStates(),
    getProfiles(),
    getCustomFieldDefinitionsCached(),
  ]);

  if (!rawCompany) {
    notFound();
  }

  const [openReminders, remarksData] = await Promise.all([
    getOpenReminders({ scope: 'all', userId: user.id, companyId: id }),
    getRemarksForCompany({ companyId: id, limit: 20 }),
  ]);

  const cleanCompany = convertBigInts(rawCompany);
  const cleanContacts = convertBigInts(rawContacts || []);
  const cleanHistory = convertBigInts(rawHistoryLogs || []);

  const industryMap = new Map(cleanIndustries.map((i: any) => [String(i.id), String(i.name)]));
  const stateMap = new Map(cleanStates.map((s: any) => [String(s.id), String(s.name)]));
  const profileNameMap: Record<string, string> = {};

  cleanProfiles.forEach((p: any) => {
    profileNameMap[String(p.id)] = String(p.fullName || p.email || 'User');
  });

  cleanContacts.sort((a: any, b: any) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  cleanHistory.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const companyData = {
    id: String(cleanCompany.id),
    name: String(cleanCompany.name),
    industryId: cleanCompany.industryId ? String(cleanCompany.industryId) : null,
    industryName: cleanCompany.industryId ? (industryMap.get(String(cleanCompany.industryId)) ?? null) : null,
    stateId: cleanCompany.stateId ? String(cleanCompany.stateId) : null,
    stateName: cleanCompany.stateId ? (stateMap.get(String(cleanCompany.stateId)) ?? null) : null,
    location: cleanCompany.location ? String(cleanCompany.location) : null,
    status: cleanCompany.status,
    priority: cleanCompany.priority,
    assignedTo: cleanCompany.assignedTo ? String(cleanCompany.assignedTo) : null,
    customFields: (cleanCompany.customFields as any) || {},
    isArchived: Boolean(cleanCompany.isArchived),
    archiveReason: cleanCompany.archiveReason ? String(cleanCompany.archiveReason) : null,
    createdAt: String(cleanCompany.createdAt),
    contacts: cleanContacts.map((c: any) => ({
      id: String(c.id),
      name: String(c.name),
      jobTitle: c.jobTitle ? String(c.jobTitle) : null,
      email: c.email ? String(c.email) : null,
      phone: c.phone ? String(c.phone) : null,
      isPrimary: Boolean(c.isPrimary),
    })),
    historyLogs: cleanHistory.map((h: any) => {
      const actorIdStr = h.actorId ? String(h.actorId) : null;
      return {
        id: String(h.id),
        action: String(h.action),
        actorId: actorIdStr,
        actorName: actorIdStr ? profileNameMap[actorIdStr] || 'User' : 'System',
        oldValue: h.oldValue ? String(h.oldValue) : null,
        newValue: h.newValue ? String(h.newValue) : null,
        details: h.details || {},
        createdAt: String(h.createdAt),
      };
    }),
    reminders: openReminders,
  };

  const activeProfilesList = cleanProfiles
    .filter((p: any) => p.isActive !== false)
    .map((p: any) => ({
      id: String(p.id),
      fullName: String(p.fullName || ''),
      email: String(p.email || ''),
    }));

  const activeIndustriesList = cleanIndustries
    .filter((i: any) => i.isActive !== false)
    .map((i: any) => ({
      id: String(i.id),
      name: String(i.name),
    }));

  const activeStatesList = cleanStates
    .filter((s: any) => s.isActive !== false)
    .map((s: any) => ({
      id: String(s.id),
      name: String(s.name),
    }));

  return (
    <CompanyDetailClient
      company={companyData}
      industries={activeIndustriesList}
      states={activeStatesList}
      profiles={activeProfilesList}
      customFieldDefinitions={customFieldDefinitions}
      profileNameMap={profileNameMap}
      currentUserId={user.id}
      initialRemarks={remarksData.remarks}
      remarksTotalCount={remarksData.totalCount}
    />
  );
}
