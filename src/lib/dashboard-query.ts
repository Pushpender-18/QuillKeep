import { cache } from 'react';
import { db } from '@/prisma/db';
import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';
import { getOpenReminders } from '@/lib/reminders';

export interface DashboardStatsData {
  contacted: number;
  meetings: number;
  conversionRate: number;
}

export interface TimeseriesPoint {
  day: string; // YYYY-MM-DD
  outreaches: number;
}

export interface TeammateActivity {
  userId: string;
  fullName: string;
  email: string;
  contacted: number;
  meetings: number;
  conversionRate: number;
}

/**
 * Fetches dashboard stats (contacted, meetings, conversion_rate) from dashboard_stats DB function.
 * Wrapped in React cache() to prevent duplicated queries across streamed widgets.
 */
export const getDashboardStats = cache(async (params: {
  from: Date;
  to: Date;
  userId?: string | null;
}): Promise<DashboardStatsData> => {
  const { from, to, userId } = params;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  try {
    const sqlBuilder = userId
      ? db.raw.sql`select * from dashboard_stats(${fromIso}::timestamptz, ${toIso}::timestamptz, ${userId}::uuid)`
      : db.raw.sql`select * from dashboard_stats(${fromIso}::timestamptz, ${toIso}::timestamptz, null::uuid)`;

    const plan = sqlBuilder
      .returnsRow({
        contacted: 'pg/text@1',
        meetings: 'pg/text@1',
        conversion_rate: 'pg/text@1',
      })
      .build();

    const res = await db.runtime().query(plan);
    let row: any = null;
    for await (const r of res) {
      row = r;
      break;
    }

    if (!row) {
      return { contacted: 0, meetings: 0, conversionRate: 0 };
    }

    const contacted = Number(row.contacted || 0);
    const meetings = Number(row.meetings || 0);
    const conversionRate = Number(row.conversion_rate || 0);

    return { contacted, meetings, conversionRate };
  } catch (err) {
    console.error('[GET_DASHBOARD_STATS_ERROR]', err);
    throw err;
  }
});

/**
 * Fetches daily outreach timeseries from outreach_timeseries DB function.
 */
export async function getOutreachTimeseries(params: {
  from: Date;
  to: Date;
  userId?: string | null;
}): Promise<TimeseriesPoint[]> {
  const { from, to, userId } = params;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  try {
    const sqlBuilder = userId
      ? db.raw.sql`select * from outreach_timeseries(${fromIso}::timestamptz, ${toIso}::timestamptz, ${userId}::uuid)`
      : db.raw.sql`select * from outreach_timeseries(${fromIso}::timestamptz, ${toIso}::timestamptz, null::uuid)`;

    const plan = sqlBuilder
      .returnsRow({
        day: 'pg/text@1',
        outreaches: 'pg/text@1',
      })
      .build();

    const res = await db.runtime().query(plan);
    const points: TimeseriesPoint[] = [];

    for await (const r of res) {
      const rawDay: any = r.day;
      let dayStr = '';
      if (typeof rawDay === 'string') {
        dayStr = rawDay.slice(0, 10);
      } else if (rawDay && typeof rawDay === 'object' && 'toISOString' in rawDay) {
        dayStr = (rawDay as Date).toISOString().slice(0, 10);
      } else if (rawDay) {
        dayStr = String(rawDay).slice(0, 10);
      }

      points.push({
        day: dayStr,
        outreaches: Number(r.outreaches || 0),
      });
    }

    return points;
  } catch (err) {
    console.error('[GET_OUTREACH_TIMESERIES_ERROR]', err);
    throw err;
  }
}

/**
 * Fetches stats per active teammate for All Team view.
 */
export async function getTeamActivity(params: {
  from: Date;
  to: Date;
}): Promise<TeammateActivity[]> {
  const { from, to } = params;

  try {
    const rawProfiles = await prisma.orm.public.Profiles.where({ isActive: true }).all();
    const cleanProfiles = convertBigInts(rawProfiles);

    const targetProfiles = cleanProfiles.slice(0, 50);

    const results = await Promise.all(
      targetProfiles.map(async (p: any) => {
        const stats = await getDashboardStats({ from, to, userId: String(p.id) });
        return {
          userId: String(p.id),
          fullName: String(p.fullName || p.email || 'Teammate'),
          email: String(p.email || ''),
          contacted: stats.contacted,
          meetings: stats.meetings,
          conversionRate: stats.conversionRate,
        };
      })
    );

    results.sort((a, b) => b.contacted - a.contacted);
    return results;
  } catch (err) {
    console.error('[GET_TEAM_ACTIVITY_ERROR]', err);
    throw err;
  }
}

/**
 * Fetches upcoming open reminders (next 8), sorted per rules:
 * overdue first (oldest first), then upcoming by due time ascending, ties broken by company priority (High > Medium > Low).
 */
export async function getDashboardReminders(params: {
  scope: 'mine' | 'all';
  userId: string;
}) {
  const { scope, userId } = params;
  const remindersScope = scope === 'mine' ? 'my' : 'all';

  try {
    const reminders = await getOpenReminders({ scope: remindersScope, userId });
    const rawCompanies = await prisma.orm.public.Companies.all();
    const cleanCompanies = convertBigInts(rawCompanies);

    const companyPriorityMap = new Map(
      cleanCompanies.map((c: any) => [String(c.id), String(c.priority || 'medium')])
    );

    const priorityScore: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    const enriched = reminders.map((r) => ({
      ...r,
      priority: (companyPriorityMap.get(r.companyId) || 'medium').toLowerCase(),
    }));

    enriched.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;

      const timeA = new Date(a.dueAt).getTime();
      const timeB = new Date(b.dueAt).getTime();
      if (timeA !== timeB) return timeA - timeB;

      const scoreA = priorityScore[a.priority] || 2;
      const scoreB = priorityScore[b.priority] || 2;
      return scoreB - scoreA;
    });

    return enriched.slice(0, 8);
  } catch (err) {
    console.error('[GET_DASHBOARD_REMINDERS_ERROR]', err);
    throw err;
  }
}
