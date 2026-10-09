import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-[10px] outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985] shadow-sm select-none';

    const variants = {
      primary:
        'bg-[#0A84FF] text-white hover:bg-[#0077ED] focus:ring-2 focus:ring-[#0A84FF]/40 border border-transparent',
      ghost:
        'bg-transparent text-[#8E8E93] hover:text-white hover:bg-white/[0.06] border border-transparent shadow-none',
      danger:
        'bg-[#FF453A] text-white hover:bg-[#D73A31] focus:ring-2 focus:ring-[#FF453A]/40 border border-transparent',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2.5 h-10 gap-2',
      lg: 'text-base px-5 py-3 h-12 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
