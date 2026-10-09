'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SerializableNotification } from '@/lib/notifications';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  fetchUserNotificationsAction,
} from '@/app/actions/notifications';
import { createClient } from '@/lib/supabase/browser';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/date-utils';
import { Bell, CheckCheck, Sparkles, Building2 } from 'lucide-react';

export interface NotificationBellProps {
  currentUserId: string;
  initialUnreadCount: number;
  initialNotifications?: SerializableNotification[];
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUserId,
  initialUnreadCount,
  initialNotifications = [],
}) => {
  const router = useRouter();

  const [isOpen, setIsOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [notifications, setNotifications] = React.useState<SerializableNotification[]>(initialNotifications);
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync initial props
  React.useEffect(() => {
    setUnreadCount(initialUnreadCount);
    setNotifications(initialNotifications);
  }, [initialUnreadCount, initialNotifications]);

  // Refetch notifications from server
  const refetchNotifications = React.useCallback(async () => {
    const res = await fetchUserNotificationsAction();
    if (res.success && res.notifications !== undefined && res.unreadCount !== undefined) {
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    }
  }, []);

  // Supabase Realtime Subscription + 60s fallback polling
  React.useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          await refetchNotifications();
          const newMsg = payload.new?.message || 'New notification received';
          setToast({ type: 'success', msg: newMsg });
        }
      )
      .subscribe();

    // 60-second fallback polling
    const intervalId = setInterval(() => {
      refetchNotifications();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [currentUserId, refetchNotifications]);

  // Click outside & Esc handler
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Toggle Dropdown Panel & fetch if empty
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      refetchNotifications();
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const res = await markAllNotificationsReadAction();
    if (res.success) {
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
    }
  };

  // Click notification item
  const handleItemClick = async (item: SerializableNotification) => {
    if (!item.readAt) {
      await markNotificationReadAction(item.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    }

    setIsOpen(false);

    // Navigation logic based on notification type
    if (item.companyId) {
      if (item.type === 'mention' && item.remarkId) {
        router.push(`/companies/${item.companyId}#remark-${item.remarkId}`);
      } else {
        router.push(`/companies/${item.companyId}`);
      }
    }
  };

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.msg}
          isOpen={Boolean(toast)}
          onClose={() => setToast(null)}
        />
      )}

      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        title="Notifications"
        className="relative p-2 rounded-xl bg-[#161618] border border-white/[0.08] text-[#8E8E93] hover:text-white hover:border-white/20 transition-all shadow-sm cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF] text-white ring-2 ring-[#0A0A0B] min-w-4 text-center leading-none">
            {badgeText}
          </span>
        )}
      </button>

      {/* Glassmorphism Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-96 bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0A84FF]/20 text-[#0A84FF]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-[#0A84FF] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#8E8E93] mb-2">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-white">You're all caught up</h4>
              <p className="text-[11px] text-[#8E8E93] mt-0.5">No notifications right now.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
              {notifications.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group ${
                      isUnread
                        ? 'bg-[#0A84FF]/10 border-[#0A84FF]/30 hover:bg-[#0A84FF]/15'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center shrink-0 mt-0.5">
                      {item.type === 'mention' ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className="text-xs text-white leading-relaxed font-normal">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-[#8E8E93]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#0A84FF] shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
