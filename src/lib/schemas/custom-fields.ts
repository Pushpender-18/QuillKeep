import { z } from 'zod';

export const customFieldTypeSchema = z.enum(['text', 'number', 'date', 'dropdown']);

export const customFieldCreateSchema = z.object({
  name: z.string().trim().min(1, 'Field name is required'),
  fieldType: customFieldTypeSchema,
  options: z.array(z.string().trim()).nullable().optional(),
});

export const customFieldUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Field name cannot be empty').optional(),
  options: z.array(z.string().trim()).optional(),
  newOptions: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
});
