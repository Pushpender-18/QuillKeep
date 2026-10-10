import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import {
  getOpenReminders,
  getOverdueCount,
  getReminderDaysForMonth,
  getCompletedReminders,
} from '@/lib/reminders';
import { getProfiles } from '@/lib/lookups';
import { TaskHubClient } from '@/components/tasks/task-hub-client';

interface TaskSectionProps {
  searchParams: Promise<{
    scope?: string;
    month?: string;
    day?: string;
  }>;
}

export async function TaskHubFullSection({ searchParams }: TaskSectionProps) {
  const [user, params, cleanProfiles] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getProfiles(),
  ]);

  const scope = (params.scope === 'all' ? 'all' : 'my') as 'my' | 'all';

  const now = new Date();
  const defaultISTMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .slice(0, 7);

  const month = params.month || defaultISTMonth;
  const day = params.day || undefined;

  let rawCompanies: any[] = [];
  try {
    rawCompanies = await prisma.orm.public.Companies.all();
  } catch (err) {
    console.error('[TASKS_FETCH_ERROR]', err);
  }

  const cleanCompanies = convertBigInts(rawCompanies);

  const activeCompaniesList = cleanCompanies.map((c: any) => ({
    id: String(c.id),
    name: String(c.name),
    isArchived: Boolean(c.isArchived),
  }));

  const activeProfilesList = cleanProfiles
    .filter((p: any) => p.isActive !== false)
    .map((p: any) => ({
      id: String(p.id),
      fullName: String(p.fullName || ''),
      email: String(p.email || ''),
    }));

  const [openReminders, overdueCount, reminderDaysMap, completedReminders] =
    await Promise.all([
      getOpenReminders({ scope, userId: user.id, day }),
      getOverdueCount(user.id, scope),
      getReminderDaysForMonth({ scope, userId: user.id, month }),
      getCompletedReminders({ scope, userId: user.id }),
    ]);

  return (
    <TaskHubClient
      openReminders={openReminders}
      completedReminders={completedReminders}
      overdueCount={overdueCount}
      reminderDaysMap={reminderDaysMap}
      currentScope={scope}
      currentMonth={month}
      selectedDay={day || null}
      companies={activeCompaniesList}
      profiles={activeProfilesList}
      currentUserId={user.id}
    />
  );
}
