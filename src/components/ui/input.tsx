import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]"
          >
            {label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-[#8E8E93] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'w-full bg-[#1C1C1E] text-white placeholder:text-zinc-500 text-sm px-3.5 py-2.5 rounded-[10px] border outline-none transition duration-150',
              error
                ? 'border-[#FF453A]/60 focus:border-[#FF453A] focus:ring-2 focus:ring-[#FF453A]/25'
                : 'border-white/[0.08] focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/25 hover:border-white/[0.14]',
              icon && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-[#FF453A] flex items-center gap-1 mt-0.5 font-normal">
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
