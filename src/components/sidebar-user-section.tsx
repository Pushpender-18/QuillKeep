import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getOverdueCount } from '@/lib/reminders';
import { Avatar } from '@/components/ui/avatar';
import { signOutAction } from '@/app/login/actions';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export async function SidebarUserProfile() {
  const user = await getCurrentUser();

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={user.fullName} email={user.email} size="md" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.fullName || 'User'}</span>
          <span className="text-[11px] text-slate-500 dark:text-[#8E8E93] truncate">{user.email}</span>
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title="Sign out"
          className="p-1.5 rounded-lg text-slate-500 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export function SidebarUserFallback() {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>
      <div className="w-7 h-7 rounded-lg bg-white/5" />
    </div>
  );
}

export async function SidebarTaskBadge() {
  const user = await getCurrentUser();
  const overdueCount = await getOverdueCount(user.id);

  if (!overdueCount || overdueCount <= 0) return null;

  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FF453A] text-white shadow-sm">
      {overdueCount}
    </span>
  );
}
