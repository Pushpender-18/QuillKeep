import { resolveRange } from '@/lib/date-range';
import {
  getDashboardStats,
  getOutreachTimeseries,
  getDashboardReminders,
  getTeamActivity,
} from '@/lib/dashboard-query';
import { getOverdueCount } from '@/lib/reminders';
import { dashboardQuerySchema } from '@/lib/schemas';
import { ServiceContext } from './companies';

export async function getDashboard(
  ctx: ServiceContext,
  rawParams: { range?: string; from?: string; to?: string; scope?: string }
) {
  const params = dashboardQuerySchema.parse(rawParams);
  const scope = (params.scope === 'all' ? 'all' : 'my') as 'my' | 'all';
  const targetUserId = scope === 'my' ? ctx.user.id : null;

  const resolved = resolveRange({
    range: params.range,
    from: params.from,
    to: params.to,
  });

  const [stats, prevStats, series, reminders, overdueCount, teamActivity] = await Promise.all([
    getDashboardStats({
      from: resolved.from,
      to: resolved.to,
      userId: targetUserId,
    }),
    getDashboardStats({
      from: resolved.prevFrom,
      to: resolved.prevTo,
      userId: targetUserId,
    }),
    getOutreachTimeseries({
      from: resolved.from,
      to: resolved.to,
      userId: targetUserId,
    }),
    getDashboardReminders({
      scope: scope === 'my' ? 'mine' : 'all',
      userId: ctx.user.id,
    }),
    getOverdueCount(ctx.user.id, scope),
    scope === 'all' ? getTeamActivity({ from: resolved.from, to: resolved.to }) : Promise.resolve(null),
  ]);

  return {
    range: {
      preset: resolved.preset,
      from: resolved.from.toISOString(),
      to: resolved.to.toISOString(),
      prevFrom: resolved.prevFrom.toISOString(),
      prevTo: resolved.prevTo.toISOString(),
      days: resolved.days,
    },
    stats: {
      contacted: stats.contacted,
      meetings: stats.meetings,
      conversionRate: stats.conversionRate,
    },
    previousStats: {
      contacted: prevStats.contacted,
      meetings: prevStats.meetings,
      conversionRate: prevStats.conversionRate,
    },
    series: series.map((s) => ({
      day: s.day,
      outreaches: s.outreaches,
    })),
    upcomingReminders: reminders.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.companyName,
      companyIsArchived: r.companyIsArchived,
      assignedTo: r.assignedTo,
      assigneeName: r.assigneeName,
      type: r.type,
      dueAt: r.dueAt,
      priority: r.priority,
      isOverdue: r.isOverdue,
    })),
    overdueCount,
    team: teamActivity
      ? teamActivity.map((t) => ({
          userId: t.userId,
          fullName: t.fullName,
          email: t.email,
          contacted: t.contacted,
          meetings: t.meetings,
          conversionRate: t.conversionRate,
        }))
      : null,
  };
}
