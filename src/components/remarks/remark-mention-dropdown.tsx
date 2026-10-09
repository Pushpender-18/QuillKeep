'use client';

import * as React from 'react';
import { ProfileOption } from '@/components/ui/select-with-avatars';
import { Avatar } from '@/components/ui/avatar';

export interface MentionDropdownProps {
  teammates: ProfileOption[];
  filterText: string;
  selectedIndex: number;
  onSelect: (teammate: ProfileOption) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const RemarkMentionDropdown: React.FC<MentionDropdownProps> = ({
  teammates,
  filterText,
  selectedIndex,
  onSelect,
  onClose,
  position,
}) => {
  const filtered = React.useMemo(() => {
    const query = filterText.toLowerCase();
    return teammates.filter(
      (t) =>
        t.fullName.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query)
    );
  }, [teammates, filterText]);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 w-72 bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5"
      style={
        position
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : { bottom: '100%', left: '0px', marginBottom: '8px' }
      }
    >
      <div className="px-2.5 py-1 text-[10px] font-semibold text-[#8E8E93] flex items-center justify-between tracking-wider">
        <span>TEAMMATES</span>
        <span className="normal-case text-[10px] font-normal">Esc to dismiss</span>
      </div>

      <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
        {filtered.map((t, idx) => {
          const isFocused = idx === selectedIndex;
          return (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent focus loss from textarea
                onSelect(t);
              }}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors w-full ${
                isFocused
                  ? 'bg-[#0A84FF]/20 text-white'
                  : 'hover:bg-white/[0.08] text-[#E4E4E7]'
              }`}
            >
              <Avatar name={t.fullName} email={t.email} size="sm" />
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs font-medium truncate ${
                    isFocused ? 'text-[#0A84FF]' : 'text-white'
                  }`}
                >
                  {t.fullName}
                </span>
                <span className="text-[11px] text-[#8E8E93] truncate">{t.email}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
