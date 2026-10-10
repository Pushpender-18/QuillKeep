import React from 'react';
import {
  getDashboardStats,
  getOutreachTimeseries,
  getTeamActivity,
  getDashboardReminders,
} from '@/lib/dashboard-query';
import { getOverdueCount } from '@/lib/reminders';
import {
  ContactedCard,
  MeetingsCard,
  ConversionCard,
  OverdueCard,
} from './stat-cards';
import { SuccessMeter } from './success-meter';
import { PerformanceChart } from './performance-chart';
import { UpcomingRemindersCard } from './upcoming-reminders-card';
import { TeamActivityCard } from './team-activity-card';

interface WidgetBaseProps {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
  scope: 'mine' | 'all';
  currentUserId: string;
}

export async function ContactedCardWidget({
  from,
  to,
  prevFrom,
  prevTo,
  days,
  scope,
  currentUserId,
}: WidgetBaseProps) {
  const targetUserId = scope === 'mine' ? currentUserId : null;
  const [currentStats, prevStats] = await Promise.all([
    getDashboardStats({ from, to, userId: targetUserId }),
    getDashboardStats({ from: prevFrom, to: prevTo, userId: targetUserId }),
  ]);

  return (
    <ContactedCard
      current={currentStats.contacted}
      prev={prevStats.contacted}
      days={days}
    />
  );
}

export async function MeetingsCardWidget({
  from,
  to,
  prevFrom,
  prevTo,
  days,
  scope,
  currentUserId,
}: WidgetBaseProps) {
  const targetUserId = scope === 'mine' ? currentUserId : null;
  const [currentStats, prevStats] = await Promise.all([
    getDashboardStats({ from, to, userId: targetUserId }),
    getDashboardStats({ from: prevFrom, to: prevTo, userId: targetUserId }),
  ]);

  return (
    <MeetingsCard
      current={currentStats.meetings}
      prev={prevStats.meetings}
      days={days}
    />
  );
}

export async function ConversionCardWidget({
  from,
  to,
  prevFrom,
  prevTo,
  days,
  scope,
  currentUserId,
}: WidgetBaseProps) {
  const targetUserId = scope === 'mine' ? currentUserId : null;
  const [currentStats, prevStats] = await Promise.all([
    getDashboardStats({ from, to, userId: targetUserId }),
    getDashboardStats({ from: prevFrom, to: prevTo, userId: targetUserId }),
  ]);

  return (
    <ConversionCard
      currentStats={currentStats}
      prevStats={prevStats}
      days={days}
    />
  );
}

export async function OverdueCardWidget({
  scope,
  currentUserId,
}: {
  scope: 'mine' | 'all';
  currentUserId: string;
}) {
  const reminderScope = scope === 'mine' ? 'my' : 'all';
  const overdueCount = await getOverdueCount(currentUserId, reminderScope);

  return <OverdueCard overdueCount={overdueCount} scope={scope} />;
}

export async function SuccessMeterWidget({
  from,
  to,
  scope,
  currentUserId,
}: Omit<WidgetBaseProps, 'prevFrom' | 'prevTo' | 'days'>) {
  const targetUserId = scope === 'mine' ? currentUserId : null;
  const stats = await getDashboardStats({ from, to, userId: targetUserId });

  return (
    <SuccessMeter
      contacted={stats.contacted}
      conversionRate={stats.conversionRate}
    />
  );
}

export async function PerformanceChartWidget({
  from,
  to,
  days,
  scope,
  currentUserId,
}: Omit<WidgetBaseProps, 'prevFrom' | 'prevTo'>) {
  const targetUserId = scope === 'mine' ? currentUserId : null;
  const points = await getOutreachTimeseries({ from, to, userId: targetUserId });

  return <PerformanceChart points={points} days={days} />;
}

export async function UpcomingRemindersWidget({
  scope,
  currentUserId,
}: {
  scope: 'mine' | 'all';
  currentUserId: string;
}) {
  const reminders = await getDashboardReminders({ scope, userId: currentUserId });

  return <UpcomingRemindersCard reminders={reminders} scope={scope} />;
}

export async function TeamActivityWidget({
  from,
  to,
  currentUserId,
}: {
  from: Date;
  to: Date;
  currentUserId: string;
}) {
  const teammates = await getTeamActivity({ from, to });

  return (
    <TeamActivityCard teammates={teammates} currentUserId={currentUserId} />
  );
}
