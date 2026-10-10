import * as React from 'react';

export interface HeaderProps {
  notifications?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ notifications }) => {
  return (
    <header className="w-full bg-[#0A0A0B]/80 backdrop-blur-md border-b border-white/[0.08] px-6 sm:px-8 py-3.5 flex items-center justify-end sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {notifications}
      </div>
    </header>
  );
};
