'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Video, Percent, AlarmClock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardStatsData } from '@/lib/dashboard-query';

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

export function ContactedCard({
  current,
  prev,
  days,
}: {
  current: number;
  prev: number;
  days: number;
}) {
  const trend = calculateTrend(current, prev);
  const vsText = `vs previous ${days} days`;

  return (
    <div className="bg-white dark:bg-[#161618] border border-slate-200/90 dark:border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs dark:shadow-sm group h-[130px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8E8E93]">
            Contacted
          </span>
          <div
            className="relative group/tooltip cursor-help"
            title="Companies whose status was changed to Contacted during the range."
          >
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white transition-colors" />
          </div>
        </div>
        <Building2 className="w-4 h-4 text-[#0A84FF]" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
          {current.toLocaleString('en-IN')}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
          {trend.type === 'up' && (
            <span className="text-emerald-700 dark:text-[#30D158] flex items-center gap-0.5">
              <span>↑</span>
              <span>{trend.label}</span>
            </span>
          )}
          {trend.type === 'down' && (
            <span className="text-rose-700 dark:text-[#FF453A] flex items-center gap-0.5">
              <span>↓</span>
              <span>{trend.label}</span>
            </span>
          )}
          {trend.type === 'new' && (
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] text-[11px] font-semibold">
              New
            </span>
          )}
          {trend.type === 'none' && <span className="text-slate-400 dark:text-[#8E8E93]">—</span>}
          {trend.type === 'same' && <span className="text-slate-400 dark:text-[#8E8E93]">0%</span>}
          <span className="text-slate-500 dark:text-[#8E8E93] font-normal">{vsText}</span>
        </div>
      </div>
    </div>
  );
}

export function MeetingsCard({
  current,
  prev,
  days,
}: {
  current: number;
  prev: number;
  days: number;
}) {
  const trend = calculateTrend(current, prev);
  const vsText = `vs previous ${days} days`;

  return (
    <div className="bg-white dark:bg-[#161618] border border-slate-200/90 dark:border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs dark:shadow-sm group h-[130px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8E8E93]">
            Meetings Scheduled
          </span>
          <div
            className="relative group/tooltip cursor-help"
            title="Companies whose status was changed to Meeting Scheduled during the range."
          >
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white transition-colors" />
          </div>
        </div>
        <Video className="w-4 h-4 text-amber-600 dark:text-[#FF9F0A]" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
          {current.toLocaleString('en-IN')}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
          {trend.type === 'up' && (
            <span className="text-emerald-700 dark:text-[#30D158] flex items-center gap-0.5">
              <span>↑</span>
              <span>{trend.label}</span>
            </span>
          )}
          {trend.type === 'down' && (
            <span className="text-rose-700 dark:text-[#FF453A] flex items-center gap-0.5">
              <span>↓</span>
              <span>{trend.label}</span>
            </span>
          )}
          {trend.type === 'new' && (
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] text-[11px] font-semibold">
              New
            </span>
          )}
          {trend.type === 'none' && <span className="text-slate-400 dark:text-[#8E8E93]">—</span>}
          {trend.type === 'same' && <span className="text-slate-400 dark:text-[#8E8E93]">0%</span>}
          <span className="text-slate-500 dark:text-[#8E8E93] font-normal">{vsText}</span>
        </div>
      </div>
    </div>
  );
}

export function ConversionCard({
  currentStats,
  prevStats,
  days,
}: {
  currentStats: DashboardStatsData;
  prevStats: DashboardStatsData;
  days: number;
}) {
  const trend = calculateTrend(
    currentStats.conversionRate,
    prevStats.conversionRate,
    true
  );
  const vsText = `vs previous ${days} days`;

  return (
    <div className="bg-white dark:bg-[#161618] border border-slate-200/90 dark:border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs dark:shadow-sm group h-[130px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8E8E93]">
            Conversion Rate
          </span>
          <div
            className="relative group/tooltip cursor-help"
            title="Conversion rate = meetings / contacted."
          >
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white transition-colors" />
          </div>
        </div>
        <Percent className="w-4 h-4 text-emerald-600 dark:text-[#30D158]" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
          {currentStats.contacted === 0
            ? 'No data'
            : `${currentStats.conversionRate.toLocaleString('en-IN')}%`}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
          {currentStats.contacted === 0 ? (
            <span className="text-slate-500 dark:text-[#8E8E93]">No outreach in range</span>
          ) : (
            <>
              {trend.type === 'up' && (
                <span className="text-emerald-700 dark:text-[#30D158] flex items-center gap-0.5">
                  <span>↑</span>
                  <span>{trend.label}</span>
                </span>
              )}
              {trend.type === 'down' && (
                <span className="text-rose-700 dark:text-[#FF453A] flex items-center gap-0.5">
                  <span>↓</span>
                  <span>{trend.label}</span>
                </span>
              )}
              {trend.type === 'new' && (
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] text-[11px] font-semibold">
                  New
                </span>
              )}
              {trend.type === 'none' && <span className="text-slate-400 dark:text-[#8E8E93]">—</span>}
              {trend.type === 'same' && <span className="text-slate-400 dark:text-[#8E8E93]">0 pts</span>}
              <span className="text-slate-500 dark:text-[#8E8E93] font-normal">{vsText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function OverdueCard({
  overdueCount,
  scope,
}: {
  overdueCount: number;
  scope: 'mine' | 'all';
}) {
  return (
    <Link
      href={`/tasks?scope=${scope}`}
      className={cn(
        'p-5 rounded-2xl flex flex-col justify-between transition-all shadow-xs dark:shadow-sm group border cursor-pointer h-[130px]',
        overdueCount > 0
          ? 'bg-rose-50/70 dark:bg-[#FF453A]/10 border-rose-200 dark:border-[#FF453A]/30 hover:border-rose-300 dark:hover:border-[#FF453A]/50'
          : 'bg-white dark:bg-[#161618] border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider',
            overdueCount > 0 ? 'text-rose-700 dark:text-[#FF453A]' : 'text-slate-500 dark:text-[#8E8E93]'
          )}
        >
          Overdue Follow-ups
        </span>
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
            overdueCount > 0
              ? 'bg-rose-100 text-rose-700 dark:bg-[#FF453A]/20 dark:text-[#FF453A]'
              : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-[#8E8E93]'
          )}
        >
          <AlarmClock className="w-4 h-4" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
          {overdueCount.toLocaleString('en-IN')}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
          {overdueCount > 0 ? (
            <span className="text-rose-700 dark:text-[#FF453A] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-[#FF453A] animate-pulse" />
              <span>Requires attention</span>
            </span>
          ) : (
            <span className="text-slate-600 dark:text-[#8E8E93] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#30D158]" />
              <span>All reminders clear</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
