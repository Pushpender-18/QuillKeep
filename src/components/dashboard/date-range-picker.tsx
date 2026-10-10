'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DateRangePreset, formatISTYYYYMMDD, getISTParts, createISTDate } from '@/lib/date-range';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  currentPreset: DateRangePreset;
  currentLabel: string;
  currentFrom: Date;
  currentTo: Date;
}

export function DateRangePicker({
  currentPreset,
  currentLabel,
  currentFrom,
  currentTo,
}: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom range selection state inside popover
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(currentPreset);
  const [customFromStr, setCustomFromStr] = useState<string>(
    formatISTYYYYMMDD(currentFrom)
  );
  const [customToStr, setCustomToStr] = useState<string>(
    formatISTYYYYMMDD(currentTo)
  );

  // State for start date pick / end date pick on calendar
  const [pickingState, setPickingState] = useState<'start' | 'end'>('start');

  // Month view pagination for calendar (showing 2 months: leftMonth & rightMonth)
  const istNow = getISTParts(new Date());
  const [viewYear, setViewYear] = useState<number>(istNow.year);
  const [viewMonth, setViewMonth] = useState<number>(istNow.month); // 1-12

  // Sync state when props change
  useEffect(() => {
    setSelectedPreset(currentPreset);
    setCustomFromStr(formatISTYYYYMMDD(currentFrom));
    setCustomToStr(formatISTYYYYMMDD(currentTo));
  }, [currentPreset, currentFrom, currentTo]);

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateURL = (newPreset: DateRangePreset, from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', newPreset);
    if (newPreset === 'custom' && from && to) {
      params.set('from', from);
      params.set('to', to);
    } else {
      params.delete('from');
      params.delete('to');
    }
    router.push(`/dashboard?${params.toString()}`);
    setIsOpen(false);
  };

  const handleSelectPreset = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      updateURL(preset);
    }
  };

  const handleApplyCustom = () => {
    updateURL('custom', customFromStr, customToStr);
  };

  // Calendar rendering helpers
  const todayStr = formatISTYYYYMMDD(new Date());

  // Left month: viewYear, viewMonth
  // Right month: viewYear + (viewMonth === 12 ? 1 : 0), viewMonth === 12 ? 1 : viewMonth + 1
  let rightYear = viewYear;
  let rightMonth = viewMonth + 1;
  if (rightMonth > 12) {
    rightMonth = 1;
    rightYear += 1;
  }

  const renderMonthCalendar = (year: number, month: number) => {
    const monthName = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));

    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-white text-center py-1">
          {monthName}
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#8E8E93] mb-1">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-7 w-7" />;
            }

            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(
              day
            ).padStart(2, '0')}`;
            const isFuture = dayStr > todayStr;

            const isFrom = dayStr === customFromStr;
            const isTo = dayStr === customToStr;
            const isInRange =
              customFromStr &&
              customToStr &&
              dayStr >= customFromStr &&
              dayStr <= customToStr;

            return (
              <button
                key={dayStr}
                type="button"
                disabled={isFuture}
                onClick={() => {
                  if (selectedPreset !== 'custom') {
                    setSelectedPreset('custom');
                  }
                  if (pickingState === 'start' || dayStr < customFromStr) {
                    setCustomFromStr(dayStr);
                    setCustomToStr(dayStr);
                    setPickingState('end');
                  } else {
                    setCustomToStr(dayStr);
                    setPickingState('start');
                  }
                }}
                className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center font-medium transition-colors text-xs',
                  isFuture && 'text-white/20 cursor-not-allowed',
                  !isFuture && !isInRange && 'text-white/80 hover:bg-white/10',
                  isInRange && 'bg-[#0A84FF]/20 text-[#0A84FF]',
                  (isFrom || isTo) && 'bg-[#0A84FF] text-white font-bold shadow-sm'
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const prevMonthNav = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonthNav = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const presetList: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'lastmonth', label: 'Last Month' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#161618] border border-white/10 hover:border-white/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-white shadow-sm transition-all"
      >
        <span className="font-medium">{currentLabel}</span>
        <CalendarIcon className="w-4 h-4 text-[#8E8E93]" />
      </button>

      {/* Popover / Modal Overlay */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-[#161618] border border-white/10 rounded-2xl shadow-2xl p-4 w-[340px] sm:w-[680px] flex flex-col gap-4 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-sm font-semibold text-white">Select Date Range</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#8E8E93] hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Presets Column */}
            <div className="flex flex-col gap-1 sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-3">
              {presetList.map((p) => {
                const isActive = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-left text-xs sm:text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#0A84FF] text-white'
                        : 'text-[#8E8E93] hover:bg-white/5 hover:text-white'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar View & Date Inputs */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Calendar Controls */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonthNav}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#8E8E93]">
                  Highlight range or enter dates below
                </span>
                <button
                  type="button"
                  onClick={nextMonthNav}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Two Month Side-by-Side (or stacked on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderMonthCalendar(viewYear, viewMonth)}
                <div className="hidden sm:block">
                  {renderMonthCalendar(rightYear, rightMonth)}
                </div>
              </div>

              {/* Start & End Date Text Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#8E8E93] uppercase">
                    Start Date
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={customFromStr}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setCustomFromStr(e.target.value);
                    }}
                    className="bg-[#201F20] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#8E8E93] uppercase">
                    End Date
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={customToStr}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setCustomToStr(e.target.value);
                    }}
                    className="bg-[#201F20] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#8E8E93] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyCustom}
              className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white text-xs px-4"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
