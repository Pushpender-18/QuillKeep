'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Info } from 'lucide-react';
import { TimeseriesPoint } from '@/lib/dashboard-query';
import { formatISTShortDate } from '@/lib/date-range';

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
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-full shadow-sm">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-medium text-white">Outreaches over time</h2>
            <div
              className="relative group cursor-help"
              title="The chart counts daily outreach events, so its total can differ slightly from the Contacted card if a company was moved to Contacted on several days."
            >
              <Info className="w-3.5 h-3.5 text-[#8E8E93] hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            {days > 90 ? 'Weekly aggregated outreach volume' : 'Daily outreach activity volume'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A84FF]" />
            <span>Outreaches</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative w-full h-64 mt-2">
        {isAllZero ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#201F20]/40 rounded-xl border border-white/5 z-10 text-center p-4">
            <p className="text-sm font-medium text-white">No outreach in this period</p>
            <p className="text-xs text-[#8E8E93] mt-1 max-w-xs">
              No status changes to Contacted occurred within the selected date range.
            </p>
          </div>
        ) : null}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0A84FF" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#414754"
              opacity={0.2}
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              stroke="#8E8E93"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8E8E93"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#1c1b1c]/95 border border-white/10 backdrop-blur-md p-3 rounded-xl shadow-xl text-xs">
                      <p className="text-[#8E8E93] font-medium pb-1 mb-1 border-b border-white/10">
                        {data.fullDate}
                      </p>
                      <div className="flex items-center justify-between gap-4 font-medium">
                        <span className="text-[#8E8E93] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#0A84FF]" /> Outreaches
                        </span>
                        <span className="text-[#0A84FF]">{data.count}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0A84FF"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#blueGlow)"
              activeDot={{ r: 5, fill: '#0A84FF', stroke: '#161618', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
