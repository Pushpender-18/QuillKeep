'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DateRangePicker } from './date-range-picker';
import { DateRangePreset } from '@/lib/date-range';
import { SegmentedControl } from '@/components/ui/segmented-control';

interface DashboardHeaderProps {
  currentScope: 'mine' | 'all';
  currentPreset: DateRangePreset;
  currentLabel: string;
  currentFrom: Date;
  currentTo: Date;
  notice?: string;
}

export function DashboardHeader({
  currentScope,
  currentPreset,
  currentLabel,
  currentFrom,
  currentTo,
  notice,
}: DashboardHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleScopeChange = (newScope: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('scope', newScope);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 pb-6 border-b border-white/[0.08]">
      {/* Top row: Title + Right Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-light text-white tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161618] border border-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
              <span className="text-white/90 font-medium">Live Sync</span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Scope Segmented Control */}
          <SegmentedControl
            size="sm"
            options={[
              { value: 'mine', label: 'My Activity' },
              { value: 'all', label: 'All Team' },
            ]}
            value={currentScope}
            onChange={handleScopeChange}
          />

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Date Range Control */}
          <DateRangePicker
            currentPreset={currentPreset}
            currentLabel={currentLabel}
            currentFrom={currentFrom}
            currentTo={currentTo}
          />
        </div>
      </div>

      {/* Caption text */}
      <p className="text-xs sm:text-sm text-[#8E8E93]">
        Activity is for the selected range. Overdue and upcoming reminders always show right now.
      </p>

      {/* Fallback Notice if custom range was invalid */}
      {notice && (
        <div className="bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 text-[#FF9F0A] text-xs px-3 py-1.5 rounded-lg w-fit">
          {notice}
        </div>
      )}
    </div>
  );
}
