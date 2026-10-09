import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { CompanyDetailClient } from '@/components/companies/company-detail-client';
import { getOpenReminders } from '@/lib/reminders';
import { getRemarksForCompany } from '@/lib/remarks';
import { getCustomFieldDefinitions } from '@/lib/custom-fields';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  let rawCompany: any = null;
  let rawContacts: any[] = [];
  let rawHistoryLogs: any[] = [];
  let rawIndustries: any[] = [];
  let rawStates: any[] = [];
  let rawProfiles: any[] = [];

  const customFieldDefinitions = await getCustomFieldDefinitions();

  try {
    rawCompany = await prisma.orm.public.Companies.where({ id }).first();
    if (rawCompany) {
      rawContacts = await prisma.orm.public.Contacts.where({ companyId: id }).all();
      rawHistoryLogs = await prisma.orm.public.HistoryLog.where({ companyId: id }).all();
    }
    rawIndustries = await prisma.orm.public.Industries.all();
    rawStates = await prisma.orm.public.States.all();
    rawProfiles = await prisma.orm.public.Profiles.all();
  } catch (err) {
    console.error('[COMPANY_DETAIL_PAGE_ERROR]', err);
  }

  if (!rawCompany) {
    notFound();
  }

  const openReminders = await getOpenReminders({ scope: 'all', userId: user.id, companyId: id });
  const remarksData = await getRemarksForCompany({ companyId: id, limit: 20 });

  const cleanCompany = convertBigInts(rawCompany);
  const cleanContacts = convertBigInts(rawContacts);
  const cleanHistory = convertBigInts(rawHistoryLogs);
  const cleanIndustries = convertBigInts(rawIndustries);
  const cleanStates = convertBigInts(rawStates);
  const cleanProfiles = convertBigInts(rawProfiles);

  const industryMap = new Map(cleanIndustries.map((i: any) => [String(i.id), String(i.name)]));
  const stateMap = new Map(cleanStates.map((s: any) => [String(s.id), String(s.name)]));
  const profileNameMap: Record<string, string> = {};
  
  cleanProfiles.forEach((p: any) => {
    profileNameMap[String(p.id)] = String(p.fullName || p.email || 'User');
  });

  // Sort contacts: Primary first, then by createdAt asc
  cleanContacts.sort((a: any, b: any) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Sort history logs: newest first
  cleanHistory.sort((a: any, b: any) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const companyData = {
    id: String(cleanCompany.id),
    name: String(cleanCompany.name),
    industryId: cleanCompany.industryId ? String(cleanCompany.industryId) : null,
    industryName: cleanCompany.industryId ? industryMap.get(String(cleanCompany.industryId)) || null : null,
    stateId: cleanCompany.stateId ? String(cleanCompany.stateId) : null,
    stateName: cleanCompany.stateId ? stateMap.get(String(cleanCompany.stateId)) || null : null,
    location: cleanCompany.location ? String(cleanCompany.location) : null,
    status: cleanCompany.status,
    priority: cleanCompany.priority,
    assignedTo: cleanCompany.assignedTo ? String(cleanCompany.assignedTo) : null,
    customFields: cleanCompany.customFields || {},
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
