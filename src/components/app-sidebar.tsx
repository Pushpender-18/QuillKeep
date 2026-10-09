'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';
import { signOutAction } from '@/app/login/actions';
import { LayoutDashboard, Building2, CheckSquare, LogOut } from 'lucide-react';
import type { ProfileUser } from '@/lib/auth';

interface SidebarProps {
  user: ProfileUser;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#201F20] text-white border border-white/[0.08] shadow-sm'
                    : 'text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-[#0A84FF]' : 'text-[#8E8E93]')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between px-2">
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
            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
