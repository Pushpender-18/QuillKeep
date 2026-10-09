'use server';

import { getCurrentUser } from '@/lib/auth';
import { withUser } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { getNotifications, SerializableNotification } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';

export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();

    await withUser(user.id, async () => {
      await prisma.orm.public.Notifications.where({
        id: notificationId,
        userId: user.id,
        readAt: null,
      }).update({
        readAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath('/tasks');
    return { success: true };
  } catch (err: any) {
    console.error('[MARK_NOTIFICATION_READ_ACTION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();

    await withUser(user.id, async () => {
      await prisma.orm.public.Notifications.where({
        userId: user.id,
        readAt: null,
      }).update({
        readAt: new Date().toISOString(),
      });
    });

    revalidatePath('/companies');
    revalidatePath('/tasks');
    return { success: true };
  } catch (err: any) {
    console.error('[MARK_ALL_NOTIFICATIONS_READ_ACTION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to mark all as read' };
  }
}

export async function fetchUserNotificationsAction(): Promise<{
  success: boolean;
  notifications?: SerializableNotification[];
  unreadCount?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const data = await getNotifications(user.id, 30);
    return { success: true, notifications: data.notifications, unreadCount: data.unreadCount };
  } catch (err: any) {
    console.error('[FETCH_USER_NOTIFICATIONS_ACTION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to fetch notifications' };
  }
}
