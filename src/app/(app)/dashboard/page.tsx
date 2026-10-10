import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { resolveRange } from '@/lib/date-range';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { WidgetErrorBoundary } from '@/components/dashboard/widget-error-boundary';
import {
  StatCardSkeleton,
  GaugeSkeleton,
  ChartSkeleton,
  ReminderListSkeleton,
  TableSkeleton,
} from '@/components/ui/skeletons';
import {
  ContactedCardWidget,
  MeetingsCardWidget,
  ConversionCardWidget,
  OverdueCardWidget,
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

export default function DashboardPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await user and searchParams inside streamed content container
  const [user, rawParams] = await Promise.all([getCurrentUser(), searchParams]);

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

  const paramsKey = `${parsed.scope}-${parsed.range}-${parsed.from || ''}-${parsed.to || ''}`;

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header controls & caption - renders immediately once header params resolve */}
      <DashboardHeader
        currentScope={parsed.scope}
        currentPreset={resolved.preset}
        currentLabel={resolved.label}
        currentFrom={resolved.from}
        currentTo={resolved.to}
        notice={resolved.notice}
      />

      {/* Row 1: KPI Stat Cards (Each wrapped in separate Suspense) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <WidgetErrorBoundary widgetName="Contacted Stat">
          <Suspense key={`contacted-${paramsKey}`} fallback={<StatCardSkeleton />}>
            <ContactedCardWidget
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

        <WidgetErrorBoundary widgetName="Meetings Stat">
          <Suspense key={`meetings-${paramsKey}`} fallback={<StatCardSkeleton />}>
            <MeetingsCardWidget
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

        <WidgetErrorBoundary widgetName="Conversion Stat">
          <Suspense key={`conversion-${paramsKey}`} fallback={<StatCardSkeleton />}>
            <ConversionCardWidget
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

        <WidgetErrorBoundary widgetName="Overdue Stat">
          <Suspense key={`overdue-${paramsKey}`} fallback={<StatCardSkeleton />}>
            <OverdueCardWidget scope={parsed.scope} currentUserId={user.id} />
          </Suspense>
        </WidgetErrorBoundary>
      </div>

      {/* Row 2: Success Meter & Performance Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <WidgetErrorBoundary widgetName="Success Meter">
            <Suspense key={`gauge-${paramsKey}`} fallback={<GaugeSkeleton />}>
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
            <Suspense key={`chart-${paramsKey}`} fallback={<ChartSkeleton />}>
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
        <Suspense key={`reminders-${paramsKey}`} fallback={<ReminderListSkeleton />}>
          <UpcomingRemindersWidget scope={parsed.scope} currentUserId={user.id} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Row 4: Team Activity (Only rendered when scope === 'all') */}
      {parsed.scope === 'all' && (
        <WidgetErrorBoundary widgetName="Team Activity">
          <Suspense key={`activity-${paramsKey}`} fallback={<TableSkeleton rowCount={5} />}>
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

function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="h-16 w-full bg-[#161618] border border-white/[0.08] rounded-2xl animate-skeleton-shimmer" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <GaugeSkeleton />
        </div>
        <div className="lg:col-span-8">
          <ChartSkeleton />
        </div>
      </div>
      <ReminderListSkeleton />
    </div>
  );
}
