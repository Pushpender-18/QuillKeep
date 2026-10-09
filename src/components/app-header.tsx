'use client';

import * as React from 'react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SerializableNotification } from '@/lib/notifications';

export interface HeaderProps {
  currentUserId: string;
  initialUnreadCount: number;
  initialNotifications?: SerializableNotification[];
}

export const Header: React.FC<HeaderProps> = ({
  currentUserId,
  initialUnreadCount,
  initialNotifications = [],
}) => {
  return (
    <header className="w-full bg-[#0A0A0B]/80 backdrop-blur-md border-b border-white/[0.08] px-6 sm:px-8 py-3.5 flex items-center justify-end sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <NotificationBell
          currentUserId={currentUserId}
          initialUnreadCount={initialUnreadCount}
          initialNotifications={initialNotifications}
        />
      </div>
    </header>
  );
};
