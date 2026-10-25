import { z } from 'zod';
import { uuidSchema } from './common';
import { companyStatusSchema, companyReminderTypeSchema } from './companies';

export const bulkIdsSchema = z
  .array(uuidSchema)
  .min(1, 'At least one company ID is required')
  .max(500, 'Bulk operations cannot exceed 500 companies');

export const bulkStatusChangeSchema = z.object({
  ids: bulkIdsSchema,
  status: companyStatusSchema,
  dueAt: z.string().nullable().optional(),
  reminderType: companyReminderTypeSchema.nullable().optional(),
  note: z.string().nullable().optional(),
});

export const bulkReassignSchema = z.object({
  ids: bulkIdsSchema,
  newAssignedTo: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
});

export const bulkArchiveSchema = z.object({
  ids: bulkIdsSchema,
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const bulkRestoreSchema = z.object({
  ids: bulkIdsSchema,
});

export const bulkDeletePreviewSchema = z.object({
  ids: bulkIdsSchema,
});

export const bulkDeleteSchema = z.object({
  ids: bulkIdsSchema,
  confirmText: z.string().min(1, 'Confirmation text is required'),
});
