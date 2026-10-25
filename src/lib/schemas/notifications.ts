import { z } from 'zod';
import { uuidSchema } from './common';

export const markNotificationsReadSchema = z.object({
  ids: z.array(uuidSchema).optional(),
  all: z.boolean().optional(),
}).refine(
  (data) => Boolean(data.all || (data.ids && data.ids.length > 0)),
  { message: 'Must provide either ids array or all: true', path: ['ids'] }
);

export const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30).optional(),
});
