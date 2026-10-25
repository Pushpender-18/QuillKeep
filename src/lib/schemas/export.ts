import { z } from 'zod';
import { companyListQuerySchema } from './companies';

export const exportQuerySchema = companyListQuerySchema.extend({
  format: z.enum(['csv', 'xlsx']).default('csv').optional(),
  exportScope: z.enum(['current', 'selected', 'all_active']).default('current').optional(),
  selectedIds: z.union([z.string(), z.array(z.string())]).optional(),
  includeArchived: z.coerce.boolean().optional(),
});
