import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import {
  getOpenReminders,
  getOverdueCount,
  getReminderDaysForMonth,
  getCompletedReminders,
} from '@/lib/reminders';
import { TaskHubClient } from '@/components/tasks/task-hub-client';

interface PageProps {
  searchParams: Promise<{
    scope?: string;
    month?: string;
    day?: string;
  }>;
}

export default async function TasksPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const scope = (params.scope === 'all' ? 'all' : 'my') as 'my' | 'all';

  // Get current IST month string (YYYY-MM) and current IST day string (YYYY-MM-DD)
  const now = new Date();
  const defaultISTMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .slice(0, 7); // YYYY-MM

  const month = params.month || defaultISTMonth;
  const day = params.day || undefined;

  let rawCompanies: any[] = [];
  let rawProfiles: any[] = [];

  try {
    rawCompanies = await prisma.orm.public.Companies.all();
    rawProfiles = await prisma.orm.public.Profiles.where({ isActive: true }).all();
  } catch (err) {
    console.error('[TASKS_PAGE_FETCH_ERROR]', err);
  }

  const cleanCompanies = convertBigInts(rawCompanies);
  const cleanProfiles = convertBigInts(rawProfiles);

  const activeCompaniesList = cleanCompanies.map((c: any) => ({
    id: String(c.id),
    name: String(c.name),
    isArchived: Boolean(c.isArchived),
  }));

  const activeProfilesList = cleanProfiles.map((p: any) => ({
    id: String(p.id),
    fullName: String(p.fullName || ''),
    email: String(p.email || ''),
  }));

  // Fetch reminder data in parallel
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
