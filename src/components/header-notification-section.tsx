import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getNotifications } from '@/lib/notifications';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Bell } from 'lucide-react';

export async function HeaderNotificationSection() {
  const user = await getCurrentUser();
  const notificationData = await getNotifications(user.id, 30);

  return (
    <NotificationBell
      currentUserId={user.id}
      initialUnreadCount={notificationData.unreadCount}
      initialNotifications={notificationData.notifications}
    />
  );
}

export function HeaderNotificationFallback() {
  return (
    <div className="relative p-2.5 rounded-xl bg-[#201F20]/60 border border-white/[0.08] text-[#8E8E93]">
      <Bell className="w-4 h-4" />
    </div>
  );
}
