'use client';

import * as React from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { LayoutDashboard, Building2, CheckSquare, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface SidebarProps {
  taskBadge?: React.ReactNode;
  userProfile?: React.ReactNode;
}

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const { pending } = useLinkStatus();

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-blue-50 text-[#0A84FF] border border-blue-200/80 dark:bg-[#201F20] dark:text-white dark:border-white/[0.08] shadow-xs'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8E8E93] dark:hover:text-white dark:hover:bg-white/[0.04]',
        pending && 'opacity-60 animate-pulse'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('w-4 h-4', isActive ? 'text-[#0A84FF]' : 'text-slate-500 dark:text-[#8E8E93]')} />
        <span>{label}</span>
      </div>
      {badge}
    </Link>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ taskBadge, userProfile }) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-[#161618] border-r border-slate-200/90 dark:border-white/[0.08] z-40 flex flex-col justify-between p-4 shadow-xs dark:shadow-xl">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center px-2 py-1">
          <div className="relative flex items-center justify-start shrink-0 py-1">
            <div className="hidden dark:block absolute left-4 top-1 w-10 h-10 bg-[#0A84FF]/25 rounded-full blur-md pointer-events-none" />
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
            onMouseEnter={() => {
              window.dispatchEvent(new CustomEvent('preload-command-palette'));
            }}
            onFocus={() => {
              window.dispatchEvent(new CustomEvent('preload-command-palette'));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#201F20]/60 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#201F20] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-500 dark:text-[#8E8E93] group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">Quick Find</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-transparent text-[10px] font-mono text-slate-600 dark:text-[#8E8E93] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavLink href="/companies" label="Companies" icon={Building2} />
          <NavLink href="/tasks" label="Task Hub" icon={CheckSquare} badge={taskBadge} />
        </nav>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex flex-col gap-2.5">
        {/* Appearance Mode */}
        <div className="flex items-center justify-between px-2.5 py-1 text-xs text-slate-600 dark:text-[#8E8E93]">
          <span className="font-medium">Theme</span>
          <ThemeToggle variant="segmented" />
        </div>

        {/* Keyboard Shortcuts Trigger Button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts-modal'))}
          onMouseEnter={() => window.dispatchEvent(new CustomEvent('preload-keyboard-shortcuts-modal'))}
          onFocus={() => window.dispatchEvent(new CustomEvent('preload-keyboard-shortcuts-modal'))}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="font-medium">Keyboard shortcuts</span>
          <kbd className="w-4 h-4 rounded bg-slate-100 dark:bg-white/[0.08] border border-slate-300 dark:border-white/10 text-[10px] font-mono text-center flex items-center justify-center text-slate-600 dark:text-[#8E8E93]">
            ?
          </kbd>
        </button>

        {userProfile}
      </div>
    </aside>
  );
};
