import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full bg-[#1C1C1E] text-white text-sm px-3.5 py-2.5 pr-8 rounded-[10px] border appearance-none outline-none transition duration-150 cursor-pointer',
              error
                ? 'border-[#FF453A]/60 focus:border-[#FF453A] focus:ring-2 focus:ring-[#FF453A]/25'
                : 'border-white/[0.08] focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/25 hover:border-white/[0.14]',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#161618] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E8E93]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs text-[#FF453A] flex items-center gap-1 mt-0.5">
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
