import { z } from 'zod';
import { uuidSchema } from './common';

export const reminderTypeSchema = z.enum(['callback', 'missed_call', 'meeting', 'manual']);

export const reminderCreateSchema = z.object({
  companyId: uuidSchema,
  type: reminderTypeSchema,
  dateStr: z.string().optional(),
  timeStr: z.string().optional(),
  dueAt: z.string().optional(),
  assignedTo: uuidSchema,
  note: z.string().trim().nullable().optional(),
}).refine(
  (data) => Boolean((data.dateStr && data.timeStr) || data.dueAt),
  { message: 'Either dueAt or both dateStr and timeStr are required', path: ['dueAt'] }
);

export const reminderUpdateSchema = z.object({
  type: reminderTypeSchema.optional(),
  dateStr: z.string().optional(),
  timeStr: z.string().optional(),
  dueAt: z.string().optional(),
  assignedTo: uuidSchema.optional(),
  note: z.string().trim().nullable().optional(),
});

export const remindersQuerySchema = z.object({
  scope: z.enum(['my', 'all']).default('my').optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Day must be YYYY-MM-DD').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM').optional(),
  companyId: uuidSchema.optional(),
  completedWindow: z.coerce.boolean().optional(),
});
