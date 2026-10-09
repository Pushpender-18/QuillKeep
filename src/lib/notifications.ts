import { prisma } from '@/lib/prisma';
import { convertBigInts } from '@/lib/utils';

export interface SerializableNotification {
  id: string;
  userId: string;
  type: 'mention' | 'assigned';
  companyId?: string | null;
  remarkId?: string | null;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const rawNotifications = await prisma.orm.public.Notifications.where({ userId }).all();
    const clean = convertBigInts(rawNotifications);
    return clean.filter((n: any) => !n.readAt).length;
  } catch (err) {
    console.error('[GET_UNREAD_NOTIFICATION_COUNT_ERROR]', err);
    return 0;
  }
}

export async function getNotifications(userId: string, limit = 30): Promise<{
  notifications: SerializableNotification[];
  unreadCount: number;
}> {
  try {
    const rawNotifications = await prisma.orm.public.Notifications.where({ userId }).all();
    const clean = convertBigInts(rawNotifications);

    // Sort newest first
    clean.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = clean.filter((n: any) => !n.readAt).length;
    const paged = clean.slice(0, limit);

    const notifications: SerializableNotification[] = paged.map((n: any) => ({
      id: String(n.id),
      userId: String(n.userId),
      type: (n._type || n.type || 'mention') as 'mention' | 'assigned',
      companyId: n.companyId ? String(n.companyId) : null,
      remarkId: n.remarkId ? String(n.remarkId) : null,
      message: String(n.message || ''),
      readAt: n.readAt ? String(n.readAt) : null,
      createdAt: String(n.createdAt),
    }));

    return { notifications, unreadCount };
  } catch (err) {
    console.error('[GET_NOTIFICATIONS_ERROR]', err);
    return { notifications: [], unreadCount: 0 };
  }
}
