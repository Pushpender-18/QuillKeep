'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';
import { TimeseriesPoint } from '@/lib/dashboard-query';
import { formatISTShortDate } from '@/lib/date-range';
import { Skeleton } from '@/components/ui/skeleton';

const DynamicRechartsArea = dynamic(
  () => import('./recharts-area').then((m) => ({ default: m.RechartsArea })),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-64 rounded-xl" />,
  }
);

interface PerformanceChartProps {
  points: TimeseriesPoint[];
  days: number;
}

export function PerformanceChart({ points, days }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!points || points.length === 0) return [];

    // Grouping by week if range > 90 days
    if (days > 90) {
      const grouped: { dateLabel: string; fullDate: string; count: number }[] = [];
      for (let i = 0; i < points.length; i += 7) {
        const chunk = points.slice(i, i + 7);
        const weekStartStr = chunk[0].day;
        const total = chunk.reduce((sum, p) => sum + p.outreaches, 0);

        const [y, m, d] = weekStartStr.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));
        const shortLabel = formatISTShortDate(dateObj);
        const fullLabel = `Week of ${formatISTShortDate(dateObj, true)}`;

        grouped.push({
          dateLabel: shortLabel,
          fullDate: fullLabel,
          count: total,
        });
      }
      return grouped;
    }

    // Daily points
    return points.map((p) => {
      const [y, m, d] = p.day.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      const shortLabel = formatISTShortDate(dateObj);
      const fullLabel = formatISTShortDate(dateObj, true);

      return {
        dateLabel: shortLabel,
        fullDate: fullLabel,
        count: p.outreaches,
      };
    });
  }, [points, days]);

  const isAllZero = useMemo(() => {
    return chartData.every((d) => d.count === 0);
  }, [chartData]);

  return (
    <div className="bg-white dark:bg-[#161618] border border-slate-200/90 dark:border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-full shadow-xs dark:shadow-sm">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Outreaches over time</h2>
            <div
              className="relative group cursor-help"
              title="The chart counts daily outreach events, so its total can differ slightly from the Contacted card if a company was moved to Contacted on several days."
            >
              <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-0.5">
            {days > 90 ? 'Weekly aggregated outreach volume' : 'Daily outreach activity volume'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#8E8E93]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A84FF]" />
            <span>Outreaches</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative w-full h-64 mt-2">
        {isAllZero ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-[#161618]/50 backdrop-blur-[0.5px] rounded-xl border border-slate-200/70 dark:border-white/5 z-10 text-center p-4 pointer-events-none">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">No outreach in this period</p>
            <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-1 max-w-xs">
              No status changes to Contacted occurred within the selected date range.
            </p>
          </div>
        ) : null}

        <DynamicRechartsArea chartData={chartData} />
      </div>
    </div>
  );
}
