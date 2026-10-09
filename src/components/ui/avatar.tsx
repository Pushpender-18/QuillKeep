import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';

export interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, email, size = 'md', className }) => {
  const initials = getInitials(name, email);

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-[#0A84FF]/20 text-[#0A84FF] font-semibold flex items-center justify-center border border-[#0A84FF]/30 shrink-0 select-none shadow-sm',
        sizes[size],
        className
      )}
      title={name || email || 'User'}
    >
      {initials}
    </div>
  );
};
