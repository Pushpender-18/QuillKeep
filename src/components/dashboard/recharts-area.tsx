'use client';

import React from 'react';
import { useTheme } from '@/components/theme-provider';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface RechartsAreaProps {
  chartData: { dateLabel: string; fullDate: string; count: number }[];
}

export function RechartsArea({ chartData }: RechartsAreaProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted
    ? resolvedTheme === 'light'
    : typeof document !== 'undefined'
    ? !document.documentElement.classList.contains('dark')
    : false;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A84FF" stopOpacity={isLight ? 0.2 : 0.3} />
            <stop offset="100%" stopColor="#0A84FF" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isLight ? '#E2E8F0' : '#414754'}
          opacity={isLight ? 0.9 : 0.25}
          vertical={false}
        />
        <XAxis
          dataKey="dateLabel"
          stroke={isLight ? '#CBD5E1' : '#8E8E93'}
          tick={{ fill: isLight ? '#64748B' : '#8E8E93', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={isLight ? '#CBD5E1' : '#8E8E93'}
          tick={{ fill: isLight ? '#64748B' : '#8E8E93', fontSize: 11 }}
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
                <div className="bg-white/95 dark:bg-[#1c1b1c]/95 border border-slate-200 dark:border-white/10 backdrop-blur-md p-3 rounded-xl shadow-xl text-xs text-slate-800 dark:text-white">
                  <p className="text-slate-500 dark:text-[#8E8E93] font-medium pb-1 mb-1 border-b border-slate-100 dark:border-white/10">
                    {data.fullDate}
                  </p>
                  <div className="flex items-center justify-between gap-4 font-medium">
                    <span className="text-slate-600 dark:text-[#8E8E93] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0A84FF]" /> Outreaches
                    </span>
                    <span className="text-[#0A84FF] font-semibold">{data.count}</span>
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
          activeDot={{ r: 5, fill: '#0A84FF', stroke: isLight ? '#FFFFFF' : '#161618', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
