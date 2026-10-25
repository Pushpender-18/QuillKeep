import { z } from 'zod';
import { uuidSchema } from './common';

export const contactCreateSchema = z.object({
  companyId: uuidSchema.optional(),
  name: z.string().trim().min(1, 'Contact name is required'),
  jobTitle: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().default(false).optional(),
});

export const contactUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Contact name cannot be empty').optional(),
  jobTitle: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().optional(),
});
