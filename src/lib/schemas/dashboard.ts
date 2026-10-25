import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  range: z.enum(['today', '7d', '30d', 'month', 'lastmonth', 'custom']).default('7d').optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
  scope: z.enum(['my', 'all']).default('my').optional(),
});
