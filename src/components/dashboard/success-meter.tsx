'use client';

import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

interface SuccessMeterProps {
  contacted: number;
  conversionRate: number;
}

export function SuccessMeter({ contacted, conversionRate }: SuccessMeterProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [animatedAngle, setAnimatedAngle] = useState(-90); // -90deg is 0% (pointing left)

  const hasData = contacted > 0;

  // Zone determination:
  // Red: 0 to <50%, Yellow: 50 to <70%, Green: 70%+
  let zoneColor = isLight ? '#64748B' : '#8E8E93';
  let zoneLabel = 'No outreach in this period';

  if (hasData) {
    if (conversionRate < 50) {
      zoneColor = isLight ? '#DC2626' : '#FF453A'; // Red
      zoneLabel = 'Needs work';
    } else if (conversionRate < 70) {
      zoneColor = isLight ? '#D97706' : '#FF9F0A'; // Yellow / Amber
      zoneLabel = 'Good';
    } else {
      zoneColor = isLight ? '#16A34A' : '#30D158'; // Green
      zoneLabel = 'Great';
    }
  }

  // Needle angle mapping: 0% -> -90deg (left), 50% -> 0deg (top), 100% -> +90deg (right)
  const clampedRate = Math.min(100, Math.max(0, conversionRate));
  const targetAngle = hasData ? -90 + (clampedRate / 100) * 180 : -90;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setAnimatedAngle(targetAngle);
    } else {
      const timer = setTimeout(() => {
        setAnimatedAngle(targetAngle);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetAngle]);

  const ariaLabelText = hasData
    ? `Conversion rate gauge: ${conversionRate}% - ${zoneLabel}`
    : 'Conversion rate gauge: No outreach in this period';

  return (
    <div className="bg-white dark:bg-[#161618] border border-slate-200/90 dark:border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-full shadow-xs dark:shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-medium text-slate-900 dark:text-white">Success Meter</h2>
          <div
            className="relative group cursor-help"
            title="Conversion rate = meetings / contacted. Measures lead qualification performance."
          >
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      {/* Gauge & Metrics Area */}
      <div className="flex flex-col items-center justify-center my-auto py-2" aria-label={ariaLabelText}>
        <div className="relative w-64 h-32 flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 200 115">
            {/* Background Track Arc */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              className="stroke-slate-200 dark:stroke-[#201F20]"
            />

            {/* Red Zone (0% to 50%) */}
            <path
              d="M 25 100 A 75 75 0 0 1 100 25"
              fill="none"
              stroke={isLight ? '#DC2626' : '#FF453A'}
              strokeWidth="16"
              strokeLinecap="round"
              className={cn(!hasData && (isLight ? 'opacity-35' : 'opacity-30'))}
            />

            {/* Yellow Zone (50% to 70%) */}
            <path
              d="M 100 25 A 75 75 0 0 1 144.08 39.32"
              fill="none"
              stroke={isLight ? '#D97706' : '#FF9F0A'}
              strokeWidth="16"
              className={cn(!hasData && (isLight ? 'opacity-35' : 'opacity-30'))}
            />

            {/* Green Zone (70% to 100%) */}
            <path
              d="M 144.08 39.32 A 75 75 0 0 1 175 100"
              fill="none"
              stroke={isLight ? '#16A34A' : '#30D158'}
              strokeWidth="16"
              strokeLinecap="round"
              className={cn(!hasData && (isLight ? 'opacity-35' : 'opacity-30'))}
            />

            {/* Needle & Pivot Cap (High Contrast in both Light & Dark via CSS classes) */}
            <g
              transform={`rotate(${animatedAngle}, 100, 100)`}
              className="transition-transform duration-1000 ease-out"
            >
              {/* Needle Line */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="32"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="stroke-slate-900 dark:stroke-white"
              />
              {/* Pivot Outer & Inner Circle */}
              <circle cx="100" cy="100" r="7" className="fill-slate-900 dark:fill-white" />
              <circle cx="100" cy="100" r="3.5" className="fill-white dark:fill-[#161618]" />
            </g>
          </svg>
        </div>

        {/* Value & Label */}
        <div className="flex flex-col items-center gap-1 mt-3 text-center">
          <div
            className="text-4xl font-light tracking-tight transition-colors text-slate-900 dark:text-white"
            style={{ color: hasData ? zoneColor : undefined }}
          >
            {hasData ? `${conversionRate}%` : '—'}
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-[#8E8E93]">{zoneLabel}</span>
        </div>
      </div>
    </div>
  );
}

