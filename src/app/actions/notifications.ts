'use server';

import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  listNotifications,
  markNotificationsRead,
} from '@/lib/services/notifications';
import { SerializableNotification } from '@/lib/notifications';

export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    await markNotificationsRead({ user }, { ids: [notificationId] });

    revalidatePath('/companies');
    revalidatePath('/tasks');
    return { success: true };
  } catch (err: any) {
    console.error('[MARK_NOTIFICATION_READ_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    await markNotificationsRead({ user }, { all: true });

    revalidatePath('/companies');
    revalidatePath('/tasks');
    return { success: true };
  } catch (err: any) {
    console.error('[MARK_ALL_NOTIFICATIONS_READ_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to mark all as read' };
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
    const data = await listNotifications({ user }, { limit: 30 });
    return { success: true, notifications: data.items as any, unreadCount: data.unreadCount };
  } catch (err: any) {
    console.error('[FETCH_USER_NOTIFICATIONS_ACTION_ERROR]', err);
    return { success: false, error: err?.message || 'Failed to fetch notifications' };
  }
}
