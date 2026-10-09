'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';
import { signOutAction } from '@/app/login/actions';
import { LayoutDashboard, Building2, CheckSquare, LogOut, Search } from 'lucide-react';
import type { ProfileUser } from '@/lib/auth';

interface SidebarProps {
  user: ProfileUser;
  overdueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, overdueCount = 0 }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Companies', href: '/companies', icon: Building2 },
    { label: 'Task Hub', href: '/tasks', icon: CheckSquare },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#161618] border-r border-white/[0.08] z-40 flex flex-col justify-between p-4 shadow-xl">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center px-2 py-1">
          <div className="relative flex items-center justify-start shrink-0 py-1">
            <div className="absolute left-4 top-1 w-10 h-10 bg-[#0A84FF]/25 rounded-full blur-md pointer-events-none" />
            <Image
              src="/logo.png"
              alt="QuillKeep Logo"
              width={140}
              height={50}
              className="w-36 h-auto object-contain relative z-10 drop-shadow-md"
              priority
            />
          </div>
        </div>

        {/* Quick Search Button (Command Palette Trigger) */}
        <div className="px-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#201F20]/60 border border-white/[0.08] text-[#8E8E93] hover:text-white hover:bg-[#201F20] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">Quick Find</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] font-mono text-[#8E8E93] group-hover:text-white transition-colors">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#201F20] text-white border border-white/[0.08] shadow-sm'
                    : 'text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('w-4 h-4', isActive ? 'text-[#0A84FF]' : 'text-[#8E8E93]')} />
                  <span>{item.label}</span>
                </div>
                {item.href === '/tasks' && overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FF453A] text-white shadow-sm">
                    {overdueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-3">
        {/* Keyboard Shortcuts Trigger Button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts-modal'))}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#8E8E93] hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="font-medium">Keyboard shortcuts</span>
          <kbd className="w-4 h-4 rounded bg-white/[0.08] border border-white/10 text-[10px] font-mono text-center flex items-center justify-center text-[#8E8E93]">
            ?
          </kbd>
        </button>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={user.fullName} email={user.email} size="md" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">{user.fullName || 'User'}</span>
              <span className="text-[11px] text-[#8E8E93] truncate">{user.email}</span>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
};
