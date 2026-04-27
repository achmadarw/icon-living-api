import { z } from 'zod';

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, 'Kategori pengeluaran wajib dipilih'),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(1000),
  attachmentUrl: z.string().url('URL lampiran tidak valid').optional(),
});

export const approveExpenseSchema = z.object({
  note: z.string().max(500).optional(),
});

export const rejectExpenseSchema = z.object({
  note: z.string().min(1, 'Alasan penolakan wajib diisi').max(500),
});

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
  categoryId: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
