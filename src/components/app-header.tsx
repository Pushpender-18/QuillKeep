'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full bg-[#0A0A0B]/80 backdrop-blur-md border-b border-white/[0.08] px-6 sm:px-8 py-3.5 flex items-center justify-end sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Placeholder Notification Bell */}
        <button
          type="button"
          title="Notifications"
          className="relative p-2 rounded-xl bg-[#161618] border border-white/[0.08] text-[#8E8E93] hover:text-white hover:border-white/20 transition-all shadow-sm"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0A84FF] ring-2 ring-[#161618]" />
        </button>
      </div>
    </header>
  );
};
