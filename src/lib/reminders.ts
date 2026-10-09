import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { parseISTDateTimeToISO } from '@/lib/date-utils';

export interface SerializableReminder {
  id: string;
  companyId: string;
  companyName: string;
  companyIsArchived: boolean;
  assignedTo: string;
  assigneeName: string;
  assigneeEmail: string;
  createdBy?: string | null;
  type: 'callback' | 'missed_call' | 'meeting' | 'manual';
  source: 'auto' | 'manual';
  dueAt: string;
  note?: string | null;
  completedAt?: string | null;
  createdAt: string;
  isOverdue: boolean;
}

export interface GetRemindersOptions {
  scope?: 'my' | 'all';
  userId: string;
  companyId?: string;
  day?: string; // YYYY-MM-DD in IST
  month?: string; // YYYY-MM in IST
}

/**
 * Returns plain serializable list of open reminders based on scope & date parameters.
 */
export async function getOpenReminders(options: GetRemindersOptions): Promise<SerializableReminder[]> {
  const { scope = 'my', userId, companyId, day } = options;

  let rawReminders: any[] = [];
  let rawCompanies: any[] = [];
  let rawProfiles: any[] = [];

  try {
    rawReminders = await prisma.orm.public.Reminders.all();
    rawCompanies = await prisma.orm.public.Companies.all();
    rawProfiles = await prisma.orm.public.Profiles.all();
  } catch (err) {
    console.error('[GET_OPEN_REMINDERS_ERROR]', err);
    return [];
  }

  const cleanReminders = convertBigInts(rawReminders);
  const cleanCompanies = convertBigInts(rawCompanies);
  const cleanProfiles = convertBigInts(rawProfiles);

  const companyMap = new Map(
    cleanCompanies.map((c: any) => [
      String(c.id),
      { name: String(c.name), isArchived: Boolean(c.isArchived) },
    ])
  );

  const profileMap = new Map(
    cleanProfiles.map((p: any) => [
      String(p.id),
      { fullName: String(p.fullName || ''), email: String(p.email || '') },
    ])
  );

  const nowTime = new Date().getTime();

  let filtered = cleanReminders.filter((r: any) => {
    // Must be uncompleted
    if (r.completedAt) return false;

    // Filter company
    const company = companyMap.get(String(r.companyId));
    if (!company || company.isArchived) return false;

    if (companyId && String(r.companyId) !== companyId) return false;

    // Filter scope
    if (scope === 'my' && String(r.assignedTo) !== userId) return false;

    // Filter day if specified (in IST timezone YYYY-MM-DD)
    if (day) {
      const dueIso = String(r.dueAt);
      const dueDate = new Date(dueIso);
      const istDayString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dueDate);

      if (istDayString !== day) return false;
    }

    return true;
  });

  // Sort by dueAt ascending
  filtered.sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  return filtered.map((r: any) => {
    const cInfo = companyMap.get(String(r.companyId)) || { name: 'Unknown Company', isArchived: false };
    const pInfo = profileMap.get(String(r.assignedTo)) || { fullName: 'Unassigned', email: '' };
    const dueTime = new Date(r.dueAt).getTime();
    const isOverdue = dueTime < nowTime;

    return {
      id: String(r.id),
      companyId: String(r.companyId),
      companyName: cInfo.name,
      companyIsArchived: cInfo.isArchived,
      assignedTo: String(r.assignedTo),
      assigneeName: pInfo.fullName || pInfo.email || 'User',
      assigneeEmail: pInfo.email,
      createdBy: r.createdBy ? String(r.createdBy) : null,
      type: r._type as any,
      source: r.source as any,
      dueAt: String(r.dueAt),
      note: r.note ? String(r.note) : null,
      completedAt: null,
      createdAt: String(r.createdAt),
      isOverdue,
    };
  });
}

/**
 * Returns overdue count for open reminders (dueAt < now, completedAt = null, company.isArchived = false).
 */
export async function getOverdueCount(userId?: string, scope: 'my' | 'all' = 'my'): Promise<number> {
  try {
    const rawReminders = await prisma.orm.public.Reminders.all();
    const rawCompanies = await prisma.orm.public.Companies.all();

    const cleanReminders = convertBigInts(rawReminders);
    const cleanCompanies = convertBigInts(rawCompanies);

    const archivedSet = new Set(
      cleanCompanies.filter((c: any) => c.isArchived).map((c: any) => String(c.id))
    );

    const nowTime = new Date().getTime();

    const count = cleanReminders.filter((r: any) => {
      if (r.completedAt) return false;
      if (archivedSet.has(String(r.companyId))) return false;
      if (scope === 'my' && userId && String(r.assignedTo) !== userId) return false;

      const dueTime = new Date(r.dueAt).getTime();
      return dueTime < nowTime;
    }).length;

    return count;
  } catch (err) {
    console.error('[GET_OVERDUE_COUNT_ERROR]', err);
    return 0;
  }
}

/**
 * Returns map of days in target month (YYYY-MM in IST) with open/overdue flags.
 */
export async function getReminderDaysForMonth(options: {
  scope?: 'my' | 'all';
  userId: string;
  month: string; // YYYY-MM
}): Promise<Record<string, { hasOpen: boolean; hasOverdue: boolean }>> {
  const { scope = 'my', userId, month } = options;
  const result: Record<string, { hasOpen: boolean; hasOverdue: boolean }> = {};

  try {
    const rawReminders = await prisma.orm.public.Reminders.all();
    const rawCompanies = await prisma.orm.public.Companies.all();

    const cleanReminders = convertBigInts(rawReminders);
    const cleanCompanies = convertBigInts(rawCompanies);

    const archivedSet = new Set(
      cleanCompanies.filter((c: any) => c.isArchived).map((c: any) => String(c.id))
    );

    const nowTime = new Date().getTime();

    cleanReminders.forEach((r: any) => {
      if (r.completedAt) return;
      if (archivedSet.has(String(r.companyId))) return;
      if (scope === 'my' && String(r.assignedTo) !== userId) return;

      const dueDate = new Date(r.dueAt);
      const istDayString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dueDate); // YYYY-MM-DD

      if (istDayString.startsWith(month)) {
        const isOverdue = dueDate.getTime() < nowTime;
        if (!result[istDayString]) {
          result[istDayString] = { hasOpen: true, hasOverdue: isOverdue };
        } else {
          result[istDayString].hasOpen = true;
          if (isOverdue) result[istDayString].hasOverdue = true;
        }
      }
    });
  } catch (err) {
    console.error('[GET_REMINDER_DAYS_FOR_MONTH_ERROR]', err);
  }

  return result;
}

/**
 * Returns completed reminders from the last 7 days for the collapsed Completed section.
 */
export async function getCompletedReminders(options: {
  scope?: 'my' | 'all';
  userId: string;
  companyId?: string;
}): Promise<SerializableReminder[]> {
  const { scope = 'my', userId, companyId } = options;

  try {
    const rawReminders = await prisma.orm.public.Reminders.all();
    const rawCompanies = await prisma.orm.public.Companies.all();
    const rawProfiles = await prisma.orm.public.Profiles.all();

    const cleanReminders = convertBigInts(rawReminders);
    const cleanCompanies = convertBigInts(rawCompanies);
    const cleanProfiles = convertBigInts(rawProfiles);

    const companyMap = new Map(
      cleanCompanies.map((c: any) => [
        String(c.id),
        { name: String(c.name), isArchived: Boolean(c.isArchived) },
      ])
    );

    const profileMap = new Map(
      cleanProfiles.map((p: any) => [
        String(p.id),
        { fullName: String(p.fullName || ''), email: String(p.email || '') },
      ])
    );

    const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;

    let filtered = cleanReminders.filter((r: any) => {
      if (!r.completedAt) return false;

      const completedTime = new Date(r.completedAt).getTime();
      if (completedTime < sevenDaysAgo) return false;

      const company = companyMap.get(String(r.companyId));
      if (!company || company.isArchived) return false;

      if (companyId && String(r.companyId) !== companyId) return false;
      if (scope === 'my' && String(r.assignedTo) !== userId) return false;

      return true;
    });

    filtered.sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    return filtered.map((r: any) => {
      const cInfo = companyMap.get(String(r.companyId)) || { name: 'Unknown Company', isArchived: false };
      const pInfo = profileMap.get(String(r.assignedTo)) || { fullName: 'Unassigned', email: '' };

      return {
        id: String(r.id),
        companyId: String(r.companyId),
        companyName: cInfo.name,
        companyIsArchived: cInfo.isArchived,
        assignedTo: String(r.assignedTo),
        assigneeName: pInfo.fullName || pInfo.email || 'User',
        assigneeEmail: pInfo.email,
        createdBy: r.createdBy ? String(r.createdBy) : null,
        type: r._type as any,
        source: r.source as any,
        dueAt: String(r.dueAt),
        note: r.note ? String(r.note) : null,
        completedAt: String(r.completedAt),
        createdAt: String(r.createdAt),
        isOverdue: false,
      };
    });
  } catch (err) {
    console.error('[GET_COMPLETED_REMINDERS_ERROR]', err);
    return [];
  }
}
