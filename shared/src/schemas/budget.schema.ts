import { z } from 'zod';

export const budgetFrequencyEnum = z.enum(['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY']);
export type BudgetFrequency = z.infer<typeof budgetFrequencyEnum>;

// Jumlah siklus per tahun berdasarkan frekuensi.
export const cyclesPerYear: Record<BudgetFrequency, number> = {
  MONTHLY: 12,
  BIMONTHLY: 6,
  QUARTERLY: 4,
  YEARLY: 1,
};

export const createBudgetSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  year: z.number().int().min(2020).max(2100),
  amountPerCycle: z.number().nonnegative('Nominal tidak boleh negatif'),
  frequency: budgetFrequencyEnum,
  note: z.string().max(255).optional().nullable(),
});

export const updateBudgetSchema = createBudgetSchema.partial().omit({ categoryId: true, year: true });

export const budgetQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  categoryId: z.string().optional(),
});

export const budgetVsActualQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
export type BudgetVsActualQuery = z.infer<typeof budgetVsActualQuerySchema>;
