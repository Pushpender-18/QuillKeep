'use client';

import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessMeterProps {
  contacted: number;
  conversionRate: number;
}

export function SuccessMeter({ contacted, conversionRate }: SuccessMeterProps) {
  const [animatedAngle, setAnimatedAngle] = useState(-90); // -90deg is 0% (pointing left)

  const hasData = contacted > 0;

  // Zone determination:
  // Red: 0 to <50%, Yellow: 50 to <70%, Green: 70%+
  let zoneColor = '#8E8E93';
  let zoneLabel = 'No outreach in this period';

  if (hasData) {
    if (conversionRate < 50) {
      zoneColor = '#FF453A'; // Red
      zoneLabel = 'Needs work';
    } else if (conversionRate < 70) {
      zoneColor = '#FF9F0A'; // Yellow / Amber
      zoneLabel = 'Good';
    } else {
      zoneColor = '#30D158'; // Green
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
    <div className="bg-[#161618] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between h-full shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-medium text-white">Success Meter</h2>
          <div
            className="relative group cursor-help"
            title="Conversion rate = meetings / contacted. Measures lead qualification performance."
          >
            <Info className="w-3.5 h-3.5 text-[#8E8E93] hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      {/* Gauge & Metrics Area */}
      <div className="flex flex-col items-center justify-center my-auto py-2" aria-label={ariaLabelText}>
        <div className="relative w-64 h-32 flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 200 115">
            {/* Background Track Arc (Grey) */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#201F20"
              strokeWidth="16"
              strokeLinecap="round"
            />

            {/* Red Zone (0% to 50%) */}
            <path
              d="M 25 100 A 75 75 0 0 1 100 25"
              fill="none"
              stroke="#FF453A"
              strokeWidth="16"
              strokeLinecap="round"
              className={cn(!hasData && 'opacity-30')}
            />

            {/* Yellow Zone (50% to 70%) */}
            <path
              d="M 100 25 A 75 75 0 0 1 144.08 39.32"
              fill="none"
              stroke="#FF9F0A"
              strokeWidth="16"
              className={cn(!hasData && 'opacity-30')}
            />

            {/* Green Zone (70% to 100%) */}
            <path
              d="M 144.08 39.32 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#30D158"
              strokeWidth="16"
              strokeLinecap="round"
              className={cn(!hasData && 'opacity-30')}
            />

            {/* White Needle & Pivot Cap */}
            <g
              transform={`rotate(${animatedAngle}, 100, 100)`}
              className="transition-transform duration-1000 ease-out"
            >
              {/* White Needle Line */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="32"
                stroke="#FFFFFF"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* White Pivot Outer & Inner Circle */}
              <circle cx="100" cy="100" r="7" fill="#FFFFFF" />
              <circle cx="100" cy="100" r="3.5" fill="#161618" />
            </g>
          </svg>
        </div>

        {/* Value & Label */}
        <div className="flex flex-col items-center gap-1 mt-3 text-center">
          <div
            className="text-4xl font-light tracking-tight transition-colors"
            style={{ color: hasData ? zoneColor : '#8E8E93' }}
          >
            {hasData ? `${conversionRate}%` : '—'}
          </div>
          <span className="text-xs font-medium text-[#8E8E93]">{zoneLabel}</span>
        </div>
      </div>
    </div>
  );
}

