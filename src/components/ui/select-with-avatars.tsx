'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { ChevronDown, Check } from 'lucide-react';

export interface ProfileOption {
  id: string;
  fullName: string;
  email: string;
}

export interface SelectWithAvatarsProps {
  options: ProfileOption[];
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const SelectWithAvatars: React.FC<SelectWithAvatarsProps> = ({
  options,
  value,
  onChange,
  label,
  error,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedProfile = options.find((opt) => opt.id === value);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('flex flex-col gap-1.5 w-full relative', className)} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full h-9 px-3 bg-[#1C1C1F] border rounded-[10px] flex items-center justify-between transition-colors text-left outline-none cursor-pointer',
          error
            ? 'border-[#FF453A]'
            : isOpen
            ? 'border-[#0A84FF] ring-1 ring-[#0A84FF]/30'
            : 'border-[#27272A] hover:border-white/20'
        )}
      >
        {selectedProfile ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={selectedProfile.fullName} email={selectedProfile.email} size="sm" />
            <span className="text-xs text-white truncate font-medium">
              {selectedProfile.fullName || selectedProfile.email}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#71717A]">Unassigned</span>
        )}
        <ChevronDown className="w-4 h-4 text-[#71717A] shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-1 max-h-56 overflow-y-auto">
          {options.map((profile) => {
            const isSelected = profile.id === value;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  onChange(profile.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left',
                  isSelected
                    ? 'bg-[#0A84FF]/20 text-white font-medium'
                    : 'text-[#E4E4E7] hover:bg-white/[0.08]'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={profile.fullName} email={profile.email} size="sm" />
                  <span className="truncate">{profile.fullName || profile.email}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#0A84FF] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-[#FF453A] mt-0.5">{error}</p>}
    </div>
  );
};
