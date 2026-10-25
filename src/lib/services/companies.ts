import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { db } from '@/prisma/db';
import { convertBigInts } from '@/lib/utils';
import { buildCompanyWhere, getFilteredCompanyIds, RawSearchParams } from '@/lib/companies-query';
import { getCustomFieldDefinitions, mergeAndValidateCustomFields } from '@/lib/custom-fields';
import { getProfiles, getIndustries, getStates, CleanProfile } from '@/lib/lookups';
import { ApiError } from '@/lib/api/errors';
import {
  companyCreateSchema,
  companyUpdateSchema,
  companyStatusChangeSchema,
  companyPrioritySchema,
} from '@/lib/schemas';
import { isPastISTDateTime } from '@/lib/date-utils';

export interface ServiceContext {
  user: {
    id: string;
    fullName?: string;
    email?: string;
  };
}

/**
 * Checks if a company name exists (case-insensitive, trimmed).
 */
export async function checkCompanyName(
  _ctx: ServiceContext,
  input: { name: string; excludeId?: string }
) {
  const cleanName = input.name.trim().toLowerCase();
  const allCompanies = await prisma.orm.public.Companies.all();
  const match = allCompanies.find(
    (c: any) =>
      String(c.name).trim().toLowerCase() === cleanName &&
      (!input.excludeId || String(c.id) !== input.excludeId)
  );

  if (match) {
    return {
      exists: true,
      isArchived: Boolean(match.isArchived),
      companyId: String(match.id),
      name: String(match.name),
    };
  }
  return { exists: false, isArchived: false, companyId: null, name: null };
}

/**
 * Lists companies matching all filters and returns paginated result { items, total, page, pageSize }
 */
export async function listCompanies(ctx: ServiceContext, rawParams: RawSearchParams) {
  const customFieldDefs = await getCustomFieldDefinitions();
  const { filters, isMatch } = await buildCompanyWhere(rawParams, ctx.user.id);

  let rawCompanies: any[] = [];
  let rawContacts: any[] = [];
  let rawRemarks: any[] = [];

  try {
    rawCompanies = await prisma.orm.public.Companies.all();
    rawContacts = await prisma.orm.public.Contacts.all();
    rawRemarks = await prisma.orm.public.Remarks.all();
  } catch (err) {
    console.error('[SERVICE_LIST_COMPANIES_FETCH_ERROR]', err);
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

  const filtered = cleanCompanies.filter((c: any) => isMatch(c, contactsMap, remarksMap));

  // Determine sort order
  const getParam = (key: string): string | undefined => {
    if (!rawParams) return undefined;
    if (rawParams instanceof URLSearchParams) return rawParams.get(key) || undefined;
    const v = rawParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const sort = getParam('sort') || 'name';
  const dir = getParam('dir') === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, parseInt(getParam('page') || '1', 10));
  const pageSize = Math.max(1, parseInt(getParam('pageSize') || '25', 10));

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
      const nameA = String(a.name || '').trim().toLowerCase();
      const nameB = String(b.name || '').trim().toLowerCase();
      result = nameA.localeCompare(nameB);
    }
    return dir === 'desc' ? -result : result;
  });

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const [cleanIndustries, cleanStates, cleanProfiles] = await Promise.all([
    getIndustries(),
    getStates(),
    getProfiles(),
  ]);

  const industryMap = new Map(cleanIndustries.map((i) => [i.id, i.name]));
  const stateMap = new Map(cleanStates.map((s) => [s.id, s.name]));
  const profileMap = new Map(cleanProfiles.map((p) => [p.id, p]));

  const items = pagedRows.map((c: any) => {
    const assignedId = c.assignedTo ? String(c.assignedTo) : null;
    const assignedProfile = assignedId ? profileMap.get(assignedId) || null : null;
    const indId = c.industryId ? String(c.industryId) : null;
    const stateId = c.stateId ? String(c.stateId) : null;

    const contacts = contactsMap.get(String(c.id)) || [];
    const primary = contacts.find((ct: any) => Boolean(ct.isPrimary)) || null;

    const industry = indId ? { id: indId, name: industryMap.get(indId) || '' } : null;
    const state = stateId ? { id: stateId, name: stateMap.get(stateId) || '' } : null;
    const assignee = assignedProfile
      ? {
          id: assignedProfile.id,
          fullName: assignedProfile.fullName || assignedProfile.name || 'User',
          isActive: Boolean(assignedProfile.isActive),
        }
      : null;
    const primaryContact = primary
      ? {
          name: String(primary.name || ''),
          email: primary.email ? String(primary.email) : null,
          phone: primary.phone ? String(primary.phone) : null,
        }
      : null;

    return {
      id: String(c.id),
      name: String(c.name),
      status: String(c.status),
      priority: String(c.priority),
      industry,
      state,
      location: c.location ? String(c.location) : null,
      assignee,
      lastContactedAt: c.lastContactedAt ? new Date(c.lastContactedAt).toISOString() : null,
      isArchived: Boolean(c.isArchived),
      archiveReason: c.archiveReason ? String(c.archiveReason) : null,
      primaryContact,
      // Backward compatibility fields
      industryId: indId,
      industryName: indId ? industryMap.get(indId) || null : null,
      stateId,
      stateName: stateId ? stateMap.get(stateId) || null : null,
      assignedTo: assignedId,
      assignedToProfile: assignedProfile,
      customFields: c.customFields || {},
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
  };
}

/**
 * Returns matching company IDs capped at 500
 */
export async function getCompanyIds(ctx: ServiceContext, rawParams: RawSearchParams) {
  return getFilteredCompanyIds(rawParams, ctx.user.id);
}

/**
 * Gets a single company by ID, including contacts and custom fields
 */
export async function getCompany(ctx: ServiceContext, input: { id: string }) {
  const rawCompany = await prisma.orm.public.Companies.where({ id: input.id }).first();
  if (!rawCompany) {
    throw ApiError.notFound('Company not found');
  }

  const rawContacts = await prisma.orm.public.Contacts.where({ companyId: input.id }).all();
  const cleanCompany = convertBigInts(rawCompany);
  const cleanContacts = convertBigInts(rawContacts || []);

  const [cleanIndustries, cleanStates, cleanProfiles] = await Promise.all([
    getIndustries(),
    getStates(),
    getProfiles(),
  ]);

  const industryMap = new Map(cleanIndustries.map((i) => [i.id, i.name]));
  const stateMap = new Map(cleanStates.map((s) => [s.id, s.name]));
  const profileMap = new Map(cleanProfiles.map((p) => [p.id, p]));

  cleanContacts.sort((a: any, b: any) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const indId = cleanCompany.industryId ? String(cleanCompany.industryId) : null;
  const stateId = cleanCompany.stateId ? String(cleanCompany.stateId) : null;
  const assignedId = cleanCompany.assignedTo ? String(cleanCompany.assignedTo) : null;

  let assignedProfile = assignedId ? profileMap.get(assignedId) || null : null;
  if (assignedId && !assignedProfile) {
    const p = await prisma.orm.public.Profiles.where({ id: assignedId }).first();
    if (p) {
      assignedProfile = {
        id: String(p.id),
        fullName: String(p.fullName || ''),
        email: String(p.email || ''),
        name: String(p.fullName || p.email || 'User'),
        isActive: Boolean(p.isActive),
      };
    }
  }

  const primary = cleanContacts.find((ct: any) => Boolean(ct.isPrimary)) || null;
  const primaryContact = primary
    ? {
        name: String(primary.name || ''),
        email: primary.email ? String(primary.email) : null,
        phone: primary.phone ? String(primary.phone) : null,
      }
    : null;

  const industry = indId ? { id: indId, name: industryMap.get(indId) || '' } : null;
  const state = stateId ? { id: stateId, name: stateMap.get(stateId) || '' } : null;
  const assignee = assignedProfile
    ? {
        id: assignedProfile.id,
        fullName: assignedProfile.fullName || assignedProfile.name || 'User',
        isActive: Boolean(assignedProfile.isActive),
      }
    : null;

  const contacts = cleanContacts.map((ct: any) => ({
    id: String(ct.id),
    companyId: String(ct.companyId),
    name: String(ct.name),
    jobTitle: ct.jobTitle ? String(ct.jobTitle) : null,
    email: ct.email ? String(ct.email) : null,
    phone: ct.phone ? String(ct.phone) : null,
    isPrimary: Boolean(ct.isPrimary),
    createdAt: ct.createdAt ? new Date(ct.createdAt).toISOString() : null,
  }));

  return {
    id: String(cleanCompany.id),
    name: String(cleanCompany.name),
    status: String(cleanCompany.status),
    priority: String(cleanCompany.priority),
    industry,
    state,
    location: cleanCompany.location ? String(cleanCompany.location) : null,
    assignee,
    lastContactedAt: cleanCompany.lastContactedAt ? new Date(cleanCompany.lastContactedAt).toISOString() : null,
    isArchived: Boolean(cleanCompany.isArchived),
    archiveReason: cleanCompany.archiveReason ? String(cleanCompany.archiveReason) : null,
    primaryContact,
    createdAt: cleanCompany.createdAt ? new Date(cleanCompany.createdAt).toISOString() : null,
    contacts,
    customFields: cleanCompany.customFields || {},
    // Compatibility fields
    industryId: indId,
    industryName: indId ? industryMap.get(indId) || null : null,
    stateId,
    stateName: stateId ? stateMap.get(stateId) || null : null,
    assignedTo: assignedId,
    assignedToProfile: assignedProfile,
    archivedAt: cleanCompany.archivedAt ? new Date(cleanCompany.archivedAt).toISOString() : null,
    archivedBy: cleanCompany.archivedBy ? String(cleanCompany.archivedBy) : null,
    updatedAt: cleanCompany.updatedAt ? new Date(cleanCompany.updatedAt).toISOString() : null,
  };
}

/**
 * Creates a new company
 */
export async function createCompany(ctx: ServiceContext, input: any) {
  const parsed = companyCreateSchema.parse(input);

  // Check uniqueness
  const check = await checkCompanyName(ctx, { name: parsed.name });
  if (check.exists) {
    throw ApiError.duplicateName('A company with this name already exists', {
      existingCompanyId: check.companyId!,
      existingName: check.name!,
      existingIsArchived: check.isArchived,
    });
  }

  // Mandatory date validation for contact_later or meeting_scheduled
  const targetStatus = parsed.initialStatus || 'new';
  if (targetStatus === 'contact_later' || targetStatus === 'meeting_scheduled') {
    if (!parsed.dueAt) {
      throw ApiError.dateRequired('A date and time is required.');
    }
    const dueDate = new Date(parsed.dueAt);
    if (isNaN(dueDate.getTime()) || dueDate.getTime() < Date.now()) {
      throw ApiError.pastDate('Past date/time is not allowed');
    }
  }

  // Custom fields validation
  const definitions = await getCustomFieldDefinitions();
  const cfValidation = mergeAndValidateCustomFields({}, parsed.customFields, definitions);
  if (!cfValidation.valid) {
    throw ApiError.validation(cfValidation.error || 'Invalid custom fields');
  }

  const companyId = await withUser(ctx.user.id, async (tx) => {
    const newCompany = await tx.orm.public.Companies.create({
      name: parsed.name.trim(),
      industryId: parsed.industryId || null,
      stateId: parsed.stateId || null,
      location: parsed.location || null,
      priority: parsed.priority,
      assignedTo: parsed.assignedTo || ctx.user.id,
      createdBy: ctx.user.id,
      status: 'new',
      customFields: cfValidation.customFields,
    });

    const id = String(newCompany.id);

    if (parsed.contactName) {
      await tx.orm.public.Contacts.create({
        companyId: id,
        name: parsed.contactName.trim(),
        email: parsed.contactEmail ? parsed.contactEmail.trim() : null,
        phone: parsed.contactPhone ? parsed.contactPhone.trim() : null,
        isPrimary: true,
      });
    }

    if (targetStatus !== 'new') {
      const dueAt = parsed.dueAt || null;
      const reminderType = parsed.reminderType || null;
      const note = parsed.note || null;

      let plan: any;
      if (dueAt && reminderType && note) {
        plan = db.raw
          .sql`select change_company_status(${id}::uuid, ${targetStatus}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, ${note})`
          .affectedCount()
          .build();
      } else if (dueAt && reminderType) {
        plan = db.raw
          .sql`select change_company_status(${id}::uuid, ${targetStatus}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, null)`
          .affectedCount()
          .build();
      } else {
        plan = db.raw
          .sql`select change_company_status(${id}::uuid, ${targetStatus}::lead_status, null::timestamptz, null::reminder_type, null)`
          .affectedCount()
          .build();
      }
      await tx.execute(plan);
    }

    return id;
  });

  return { id: companyId, companyId };
}

/**
 * Updates company details
 */
export async function updateCompany(ctx: ServiceContext, input: { id: string; data: any }) {
  const { id } = input;
  const parsed = companyUpdateSchema.parse(input.data);

  // Check company exists and is active
  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }

  const cleanExisting = convertBigInts(existing);
  if (cleanExisting.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  // Name uniqueness check if name modified
  if (parsed.name && parsed.name.trim().toLowerCase() !== String(cleanExisting.name).trim().toLowerCase()) {
    const check = await checkCompanyName(ctx, { name: parsed.name, excludeId: id });
    if (check.exists) {
      throw ApiError.duplicateName('A company with this name already exists', {
        existingCompanyId: check.companyId!,
        existingName: check.name!,
        existingIsArchived: check.isArchived,
      });
    }
  }

  let validatedCF: Record<string, any> | undefined = undefined;
  if (parsed.customFields !== undefined) {
    const existingCF = (cleanExisting.customFields as Record<string, any>) || {};
    const definitions = await getCustomFieldDefinitions();
    const cfValidation = mergeAndValidateCustomFields(existingCF, parsed.customFields, definitions);
    if (!cfValidation.valid) {
      throw ApiError.validation(cfValidation.error || 'Invalid custom fields');
    }
    validatedCF = cfValidation.customFields;
  }

  await withUser(ctx.user.id, async (tx) => {
    const updateData: any = {};
    if (parsed.name) updateData.name = parsed.name.trim();
    if (parsed.industryId !== undefined) updateData.industryId = parsed.industryId || null;
    if (parsed.stateId !== undefined) updateData.stateId = parsed.stateId || null;
    if (parsed.location !== undefined) updateData.location = parsed.location || null;
    if (parsed.priority) updateData.priority = parsed.priority;
    if (parsed.assignedTo !== undefined) updateData.assignedTo = parsed.assignedTo || null;
    if (validatedCF !== undefined) updateData.customFields = validatedCF;
    updateData.updatedAt = new Date().toISOString();

    await tx.orm.public.Companies.where({ id }).update(updateData);
  });

  return { success: true, id };
}

/**
 * Updates company status strictly via change_company_status DB function
 */
export async function changeCompanyStatus(
  ctx: ServiceContext,
  input: {
    id: string;
    status: string;
    dueAt?: string | null;
    reminderType?: string | null;
    note?: string | null;
  }
) {
  const { id } = input;
  const parsed = companyStatusChangeSchema.parse(input);

  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }

  const cleanExisting = convertBigInts(existing);
  if (cleanExisting.isArchived) {
    throw ApiError.archivedCompany('Cannot change status of an archived company');
  }

  if (parsed.status === 'contact_later' || parsed.status === 'meeting_scheduled') {
    if (!parsed.dueAt) {
      throw ApiError.dateRequired('A date and time is required.');
    }
    const dueDate = new Date(parsed.dueAt);
    if (isNaN(dueDate.getTime()) || dueDate.getTime() < Date.now()) {
      throw ApiError.pastDate('Past date/time is not allowed when setting reminders.');
    }
  }

  await withUser(ctx.user.id, async (tx) => {
    const dueAt = parsed.dueAt || null;
    const reminderType = parsed.reminderType || null;
    const note = parsed.note || null;

    let plan: any;
    if (dueAt && reminderType && note) {
      plan = db.raw
        .sql`select change_company_status(${id}::uuid, ${parsed.status}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, ${note})`
        .affectedCount()
        .build();
    } else if (dueAt && reminderType) {
      plan = db.raw
        .sql`select change_company_status(${id}::uuid, ${parsed.status}::lead_status, ${dueAt}::timestamptz, ${reminderType}::reminder_type, null)`
        .affectedCount()
        .build();
    } else {
      plan = db.raw
        .sql`select change_company_status(${id}::uuid, ${parsed.status}::lead_status, null::timestamptz, null::reminder_type, null)`
        .affectedCount()
        .build();
    }
    await tx.execute(plan);
  });

  return await getCompany(ctx, { id });
}

/**
 * Archives a single company
 */
export async function archiveCompany(
  ctx: ServiceContext,
  input: { id: string; reason?: string | null; note?: string | null }
) {
  const { id, reason, note } = input;
  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }

  const finalReason = [reason, note].filter(Boolean).join(' - ') || 'Archived';

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Companies.where({ id }).update({
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: ctx.user.id,
      archiveReason: finalReason,
      updatedAt: new Date().toISOString(),
    });
  });

  return { success: true };
}

/**
 * Restores a single archived company
 */
export async function restoreCompany(ctx: ServiceContext, input: { id: string }) {
  const { id } = input;
  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Companies.where({ id }).update({
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      updatedAt: new Date().toISOString(),
    });
  });

  return { success: true };
}

/**
 * Updates company priority
 */
export async function updateCompanyPriority(
  ctx: ServiceContext,
  input: { id: string; priority: 'low' | 'medium' | 'high' }
) {
  const { id, priority } = input;
  const parsed = companyPrioritySchema.parse(priority);

  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }
  if (existing.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Companies.where({ id }).update({
      priority: parsed,
      updatedAt: new Date().toISOString(),
    });
  });

  return { success: true };
}

/**
 * Updates company assignee
 */
export async function updateCompanyAssignee(
  ctx: ServiceContext,
  input: { id: string; assignedTo: string | null }
) {
  const { id, assignedTo } = input;
  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }
  if (existing.isArchived) {
    throw ApiError.archivedCompany('Cannot modify an archived company');
  }

  await withUser(ctx.user.id, async (tx) => {
    await tx.orm.public.Companies.where({ id }).update({
      assignedTo: assignedTo || null,
      updatedAt: new Date().toISOString(),
    });
  });

  return { success: true };
}

/**
 * Gets company history logs
 */
export async function getCompanyHistory(ctx: ServiceContext, input: { id: string; page?: number | string }) {
  const { id } = input;
  const existing = await prisma.orm.public.Companies.where({ id }).first();
  if (!existing) {
    throw ApiError.notFound('Company not found');
  }

  const rawLogs = await prisma.orm.public.HistoryLog.where({ companyId: id }).all();
  const cleanLogs = convertBigInts(rawLogs || []);

  const cleanProfiles = await getProfiles();
  const profileMap = new Map<string, CleanProfile>(cleanProfiles.map((p) => [p.id, p]));

  const resolveProfile = async (userId: string | null) => {
    if (!userId) return null;
    let p = profileMap.get(userId);
    if (!p) {
      const dbP = await prisma.orm.public.Profiles.where({ id: userId }).first();
      if (dbP) {
        p = {
          id: String(dbP.id),
          fullName: String(dbP.fullName || ''),
          email: String(dbP.email || ''),
          name: String(dbP.fullName || dbP.email || 'User'),
          isActive: Boolean(dbP.isActive),
        };
        profileMap.set(userId, p);
      }
    }
    return p ? { id: p.id, fullName: p.fullName || p.name || 'User' } : null;
  };

  cleanLogs.sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const items = await Promise.all(
    cleanLogs.map(async (h: any) => {
      const actorIdStr = h.actorId ? String(h.actorId) : null;
      const actorProfile = await resolveProfile(actorIdStr);
      const action = String(h.action);

      const base: Record<string, any> = {
        id: String(h.id),
        companyId: String(h.companyId),
        action,
        oldValue: h.oldValue ? String(h.oldValue) : null,
        newValue: h.newValue ? String(h.newValue) : null,
        details: h.details || {},
        createdAt: h.createdAt ? new Date(h.createdAt).toISOString() : null,
        actor: actorProfile,
        actorId: actorIdStr,
        actorName: actorProfile ? actorProfile.fullName : (actorIdStr ? 'User' : 'System'),
      };

      if (action === 'reassigned') {
        base.oldAssignee = await resolveProfile(h.oldValue ? String(h.oldValue) : null);
        base.newAssignee = await resolveProfile(h.newValue ? String(h.newValue) : null);
      }

      return base;
    })
  );

  const page = Math.max(1, parseInt(String(input.page || '1'), 10));
  const pageSize = 50;
  const total = items.length;
  const startIndex = (page - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: pagedItems,
    total,
    page,
    pageSize,
  };
}
