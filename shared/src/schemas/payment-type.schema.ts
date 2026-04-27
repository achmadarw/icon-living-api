import { z } from 'zod';

export const createPaymentTypeSchema = z.object({
  name: z.string().min(1, 'Nama jenis pembayaran wajib diisi').max(100),
  description: z.string().max(255).optional(),
  fixedAmount: z.number().positive('Nominal harus lebih dari 0').nullable().optional(),
  isMandatory: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updatePaymentTypeSchema = createPaymentTypeSchema.partial();

export type CreatePaymentTypeInput = z.infer<typeof createPaymentTypeSchema>;
export type UpdatePaymentTypeInput = z.infer<typeof updatePaymentTypeSchema>;
