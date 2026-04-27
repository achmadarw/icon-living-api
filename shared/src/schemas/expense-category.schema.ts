import { z } from 'zod';

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(100),
  description: z.string().max(255).optional(),
  requiresApproval: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;
