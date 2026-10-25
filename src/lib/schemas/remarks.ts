import { z } from 'zod';
import { uuidSchema } from './common';

export const remarkCreateSchema = z.object({
  companyId: uuidSchema.optional(),
  body: z.string().trim().min(1, 'Remark cannot be empty').max(5000, 'Remark cannot exceed 5000 characters'),
  mentionIds: z.array(uuidSchema).optional().default([]),
});

export const remarkUpdateSchema = z.object({
  body: z.string().trim().min(1, 'Remark cannot be empty').max(5000, 'Remark cannot exceed 5000 characters'),
  mentionIds: z.array(uuidSchema).optional().default([]),
});

export const remarksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
