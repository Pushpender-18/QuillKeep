'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Video, Percent, AlarmClock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardStatsData } from '@/lib/dashboard-query';

interface StatCardsProps {
  currentStats: DashboardStatsData;
  prevStats: DashboardStatsData;
  overdueCount: number;
  days: number;
  scope: 'mine' | 'all';
}

function calculateTrend(
  current: number,
  prev: number,
  isPercentagePoints = false
) {
  if (prev === 0 && current > 0) {
    return { type: 'new', label: 'New' };
  }
  if (prev === 0 && current === 0) {
    return { type: 'none', label: '—' };
  }

  if (isPercentagePoints) {
    const diff = Number((current - prev).toFixed(1));
    if (diff > 0) {
      return { type: 'up', label: `+${diff} pts` };
    }
    if (diff < 0) {
      return { type: 'down', label: `${diff} pts` };
    }
    return { type: 'same', label: '0 pts' };
  }

  const pct = Number((((current - prev) / prev) * 100).toFixed(1));
  if (pct > 0) {
    return { type: 'up', label: `+${pct}%` };
  }
  if (pct < 0) {
    return { type: 'down', label: `${pct}%` };
  }
  return { type: 'same', label: '0%' };
}

export function StatCards({
  currentStats,
  prevStats,
  overdueCount,
  days,
  scope,
}: StatCardsProps) {
  const contactedTrend = calculateTrend(currentStats.contacted, prevStats.contacted);
  const meetingsTrend = calculateTrend(currentStats.meetings, prevStats.meetings);
  const conversionTrend = calculateTrend(
    currentStats.conversionRate,
    prevStats.conversionRate,
    true
  );

  const vsText = `vs previous ${days} days`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Total Companies Contacted */}
      <div className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Contacted
            </span>
            <div
              className="relative group/tooltip cursor-help"
              title="Companies whose status was changed to Contacted during the range."
            >
              <Info className="w-3.5 h-3.5 text-[#8E8E93] hover:text-white transition-colors" />
            </div>
          </div>
          <Building2 className="w-4 h-4 text-[#0A84FF]" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-light text-white tracking-tight">
            {currentStats.contacted.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
            {contactedTrend.type === 'up' && (
              <span className="text-[#30D158] flex items-center gap-0.5">
                <span>↑</span>
                <span>{contactedTrend.label}</span>
              </span>
            )}
            {contactedTrend.type === 'down' && (
              <span className="text-[#FF453A] flex items-center gap-0.5">
                <span>↓</span>
                <span>{contactedTrend.label}</span>
              </span>
            )}
            {contactedTrend.type === 'new' && (
              <span className="px-1.5 py-0.5 rounded bg-[#0A84FF]/20 text-[#0A84FF] text-[11px]">
                New
              </span>
            )}
            {contactedTrend.type === 'none' && (
              <span className="text-[#8E8E93]">—</span>
            )}
            {contactedTrend.type === 'same' && (
              <span className="text-[#8E8E93]">0%</span>
            )}
            <span className="text-[#8E8E93] font-normal">{vsText}</span>
          </div>
        </div>
      </div>

      {/* 2. Meetings Scheduled */}
      <div className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Meetings Scheduled
            </span>
            <div
              className="relative group/tooltip cursor-help"
              title="Companies whose status was changed to Meeting Scheduled during the range."
            >
              <Info className="w-3.5 h-3.5 text-[#8E8E93] hover:text-white transition-colors" />
            </div>
          </div>
          <Video className="w-4 h-4 text-[#FF9F0A]" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-light text-white tracking-tight">
            {currentStats.meetings.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
            {meetingsTrend.type === 'up' && (
              <span className="text-[#30D158] flex items-center gap-0.5">
                <span>↑</span>
                <span>{meetingsTrend.label}</span>
              </span>
            )}
            {meetingsTrend.type === 'down' && (
              <span className="text-[#FF453A] flex items-center gap-0.5">
                <span>↓</span>
                <span>{meetingsTrend.label}</span>
              </span>
            )}
            {meetingsTrend.type === 'new' && (
              <span className="px-1.5 py-0.5 rounded bg-[#0A84FF]/20 text-[#0A84FF] text-[11px]">
                New
              </span>
            )}
            {meetingsTrend.type === 'none' && (
              <span className="text-[#8E8E93]">—</span>
            )}
            {meetingsTrend.type === 'same' && (
              <span className="text-[#8E8E93]">0%</span>
            )}
            <span className="text-[#8E8E93] font-normal">{vsText}</span>
          </div>
        </div>
      </div>

      {/* 3. Conversion Rate */}
      <div className="bg-[#161618] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Conversion Rate
            </span>
            <div
              className="relative group/tooltip cursor-help"
              title="Conversion rate = meetings / contacted."
            >
              <Info className="w-3.5 h-3.5 text-[#8E8E93] hover:text-white transition-colors" />
            </div>
          </div>
          <Percent className="w-4 h-4 text-[#30D158]" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-light text-white tracking-tight">
            {currentStats.contacted === 0
              ? 'No data'
              : `${currentStats.conversionRate.toLocaleString('en-IN')}%`}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
            {currentStats.contacted === 0 ? (
              <span className="text-[#8E8E93]">No outreach in range</span>
            ) : (
              <>
                {conversionTrend.type === 'up' && (
                  <span className="text-[#30D158] flex items-center gap-0.5">
                    <span>↑</span>
                    <span>{conversionTrend.label}</span>
                  </span>
                )}
                {conversionTrend.type === 'down' && (
                  <span className="text-[#FF453A] flex items-center gap-0.5">
                    <span>↓</span>
                    <span>{conversionTrend.label}</span>
                  </span>
                )}
                {conversionTrend.type === 'new' && (
                  <span className="px-1.5 py-0.5 rounded bg-[#0A84FF]/20 text-[#0A84FF] text-[11px]">
                    New
                  </span>
                )}
                {conversionTrend.type === 'none' && (
                  <span className="text-[#8E8E93]">—</span>
                )}
                {conversionTrend.type === 'same' && (
                  <span className="text-[#8E8E93]">0 pts</span>
                )}
                <span className="text-[#8E8E93] font-normal">{vsText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Overdue Follow-ups (Clickable link to /tasks) */}
      <Link
        href={`/tasks?scope=${scope}`}
        className={cn(
          'p-5 rounded-2xl flex flex-col justify-between transition-all shadow-sm group border cursor-pointer',
          overdueCount > 0
            ? 'bg-[#FF453A]/10 border-[#FF453A]/30 hover:border-[#FF453A]/50'
            : 'bg-[#161618] border-white/[0.08] hover:border-white/20'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className={cn(
              'text-[11px] font-semibold uppercase tracking-wider',
              overdueCount > 0 ? 'text-[#FF453A]' : 'text-[#8E8E93]'
            )}
          >
            Overdue Follow-ups
          </span>
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              overdueCount > 0
                ? 'bg-[#FF453A]/20 text-[#FF453A]'
                : 'bg-white/5 text-[#8E8E93]'
            )}
          >
            <AlarmClock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-light text-white tracking-tight">
            {overdueCount.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            {overdueCount > 0 ? (
              <span className="text-[#FF453A] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] animate-pulse" />
                <span>Requires attention</span>
              </span>
            ) : (
              <span className="text-[#8E8E93] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
                <span>All reminders clear</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
