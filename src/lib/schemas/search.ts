import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().default('').optional(),
});
