import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/db';
import { getNotifications, getUnreadNotificationCount } from '@/lib/notifications';
import { markNotificationsReadSchema, notificationsQuerySchema } from '@/lib/schemas';
import { ServiceContext } from './companies';

export async function listNotifications(ctx: ServiceContext, input?: { limit?: number }) {
  const parsed = notificationsQuerySchema.parse(input || {});
  const data = await getNotifications(ctx.user.id, parsed.limit || 30);
  return {
    items: data.notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      companyId: n.companyId,
      remarkId: n.remarkId,
      message: n.message,
      readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
      createdAt: new Date(n.createdAt).toISOString(),
    })),
    unreadCount: data.unreadCount,
  };
}

export async function getUnreadCount(ctx: ServiceContext) {
  const count = await getUnreadNotificationCount(ctx.user.id);
  return { unreadCount: count };
}

export async function markNotificationsRead(
  ctx: ServiceContext,
  input: { ids?: string[]; all?: boolean }
) {
  const parsed = markNotificationsReadSchema.parse(input);

  await withUser(ctx.user.id, async () => {
    if (parsed.all) {
      await prisma.orm.public.Notifications.where({
        userId: ctx.user.id,
        readAt: null,
      }).update({
        readAt: new Date().toISOString(),
      });
    } else if (parsed.ids && parsed.ids.length > 0) {
      for (const id of parsed.ids) {
        await prisma.orm.public.Notifications.where({
          id,
          userId: ctx.user.id,
          readAt: null,
        }).update({
          readAt: new Date().toISOString(),
        });
      }
    }
  });

  return { success: true };
}
