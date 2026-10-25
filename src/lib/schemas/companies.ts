import { z } from 'zod';
import { uuidSchema, sortDirSchema } from './common';

export const companyPrioritySchema = z.enum(['low', 'medium', 'high']);
export const companyStatusSchema = z.enum([
  'new',
  'contacted',
  'not_interested',
  'contact_later',
  'meeting_scheduled',
]);
export const companyReminderTypeSchema = z.enum([
  'callback',
  'meeting',
  'missed_call',
  'manual',
]);

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required'),
  industryId: z.string().nullable().optional(),
  stateId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  priority: companyPrioritySchema.default('medium'),
  assignedTo: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  initialStatus: companyStatusSchema.optional(),
  dueAt: z.string().nullable().optional(),
  reminderType: companyReminderTypeSchema.nullable().optional(),
  note: z.string().nullable().optional(),
  customFields: z.record(z.string(), z.any()).nullable().optional(),
});

export const companyUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Company name cannot be empty').optional(),
  industryId: z.string().nullable().optional(),
  stateId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  priority: companyPrioritySchema.optional(),
  assignedTo: z.string().nullable().optional(),
  customFields: z.record(z.string(), z.any()).nullable().optional(),
});

export const companyStatusChangeSchema = z.object({
  status: companyStatusSchema,
  dueAt: z.string().nullable().optional(),
  reminderType: companyReminderTypeSchema.nullable().optional(),
  note: z.string().nullable().optional(),
});

export const companyPriorityUpdateSchema = z.object({
  priority: companyPrioritySchema,
});

export const companyAssigneeUpdateSchema = z.object({
  assignedTo: z.string().nullable().optional(),
});

export const companyArchiveSchema = z.object({
  reason: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const companyListQuerySchema = z.object({
  view: z.enum(['active', 'archived', 'all']).default('active').optional(),
  scope: z.enum(['my', 'all']).default('my').optional(),
  q: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  state: z.union([z.string(), z.array(z.string())]).optional(),
  industry: z.union([z.string(), z.array(z.string())]).optional(),
  assigned: z.union([z.string(), z.array(z.string())]).optional(),
  priority: z.union([z.string(), z.array(z.string())]).optional(),
  location: z.string().optional(),
  sort: z.enum(['name', 'last_contact', 'priority']).default('name').optional(),
  dir: sortDirSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).optional(),
});

export const companyCheckNameSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required'),
  excludeId: uuidSchema.optional(),
});
