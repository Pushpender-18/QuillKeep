'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';

export interface DateTimeFieldProps {
  dateValue: string; // YYYY-MM-DD
  timeValue: string; // HH:mm
  onDateChange: (val: string) => void;
  onTimeChange: (val: string) => void;
  dateLabel?: string;
  timeLabel?: string;
  error?: string;
  disabled?: boolean;
  minDate?: string;
  className?: string;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateLabel = 'DATE',
  timeLabel = 'TIME',
  error,
  disabled = false,
  minDate,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      <div className="grid grid-cols-2 gap-3">
        {/* Date Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            {dateLabel}
          </label>
          <div
            className={cn(
              'flex items-center gap-2 bg-[#1C1C1E] border rounded-[10px] px-3 py-2 text-sm text-white transition-colors',
              error ? 'border-[#FF453A]' : 'border-white/10 focus-within:border-[#0A84FF]'
            )}
          >
            <Calendar className="w-4 h-4 text-[#8E8E93] shrink-0" />
            <input
              type="date"
              value={dateValue}
              min={minDate}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={disabled}
              className="bg-transparent w-full text-white text-xs sm:text-sm outline-none cursor-pointer border-none [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Time Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            {timeLabel}
          </label>
          <div
            className={cn(
              'flex items-center gap-2 bg-[#1C1C1E] border rounded-[10px] px-3 py-2 text-sm text-white transition-colors',
              error ? 'border-[#FF453A]' : 'border-white/10 focus-within:border-[#0A84FF]'
            )}
          >
            <Clock className="w-4 h-4 text-[#8E8E93] shrink-0" />
            <input
              type="time"
              value={timeValue}
              onChange={(e) => onTimeChange(e.target.value)}
              disabled={disabled}
              className="bg-transparent w-full text-white text-xs sm:text-sm outline-none cursor-pointer border-none [color-scheme:dark]"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-[#FF453A] mt-0.5">{error}</p>}
    </div>
  );
};
