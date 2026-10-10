import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { resolveRange } from '@/lib/date-range';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { WidgetErrorBoundary } from '@/components/dashboard/widget-error-boundary';
import {
  StatCardsSkeleton,
  SuccessMeterSkeleton,
  PerformanceChartSkeleton,
  UpcomingRemindersSkeleton,
  TeamActivitySkeleton,
} from '@/components/dashboard/widget-skeletons';
import {
  StatCardsWidget,
  SuccessMeterWidget,
  PerformanceChartWidget,
  UpcomingRemindersWidget,
  TeamActivityWidget,
} from '@/components/dashboard/dashboard-widgets';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const searchParamsSchema = z.object({
  range: z.enum(['today', '7d', '30d', 'month', 'lastmonth', 'custom']).catch('7d'),
  scope: z.enum(['mine', 'all']).catch('mine'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const rawParams = await searchParams;

  const parsed = searchParamsSchema.parse({
    range: typeof rawParams.range === 'string' ? rawParams.range : undefined,
    scope: typeof rawParams.scope === 'string' ? rawParams.scope : undefined,
    from: typeof rawParams.from === 'string' ? rawParams.from : undefined,
    to: typeof rawParams.to === 'string' ? rawParams.to : undefined,
  });

  const resolved = resolveRange({
    range: parsed.range,
    from: parsed.from,
    to: parsed.to,
  });

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header controls & caption */}
      <DashboardHeader
        currentScope={parsed.scope}
        currentPreset={resolved.preset}
        currentLabel={resolved.label}
        currentFrom={resolved.from}
        currentTo={resolved.to}
        notice={resolved.notice}
      />

      {/* Row 1: KPI Stat Cards */}
      <WidgetErrorBoundary widgetName="Stat Cards">
        <Suspense fallback={<StatCardsSkeleton />}>
          <StatCardsWidget
            from={resolved.from}
            to={resolved.to}
            prevFrom={resolved.prevFrom}
            prevTo={resolved.prevTo}
            days={resolved.days}
            scope={parsed.scope}
            currentUserId={user.id}
          />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Row 2: Success Meter & Performance Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <WidgetErrorBoundary widgetName="Success Meter">
            <Suspense fallback={<SuccessMeterSkeleton />}>
              <SuccessMeterWidget
                from={resolved.from}
                to={resolved.to}
                scope={parsed.scope}
                currentUserId={user.id}
              />
            </Suspense>
          </WidgetErrorBoundary>
        </div>

        <div className="lg:col-span-8">
          <WidgetErrorBoundary widgetName="Performance Chart">
            <Suspense fallback={<PerformanceChartSkeleton />}>
              <PerformanceChartWidget
                from={resolved.from}
                to={resolved.to}
                days={resolved.days}
                scope={parsed.scope}
                currentUserId={user.id}
              />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Row 3: Upcoming Reminders */}
      <WidgetErrorBoundary widgetName="Upcoming Reminders">
        <Suspense fallback={<UpcomingRemindersSkeleton />}>
          <UpcomingRemindersWidget
            scope={parsed.scope}
            currentUserId={user.id}
          />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Row 4: Team Activity (Only rendered when scope === 'all') */}
      {parsed.scope === 'all' && (
        <WidgetErrorBoundary widgetName="Team Activity">
          <Suspense fallback={<TeamActivitySkeleton />}>
            <TeamActivityWidget
              from={resolved.from}
              to={resolved.to}
              currentUserId={user.id}
            />
          </Suspense>
        </WidgetErrorBoundary>
      )}
    </div>
  );
}
