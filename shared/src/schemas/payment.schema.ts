import { z } from 'zod';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const createPaymentSchema = z.object({
  paymentTypeId: z.string().min(1, 'Jenis pembayaran wajib dipilih'),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  bankName: z.string().min(1, 'Nama bank wajib diisi').max(100),
  accountName: z.string().max(100).optional(),
  transferDate: z.string().min(1, 'Tanggal transfer wajib diisi'),
  proofImageUrl: z.string().min(1, 'URL bukti transfer wajib diisi'),
  description: z.string().max(500).optional(),
  periods: z
    .array(z.string().regex(PERIOD_REGEX, 'Format periode: YYYY-MM'))
    .min(1, 'Minimal 1 periode harus dipilih')
    .max(12, 'Maksimal 12 periode sekaligus'),
});

export const reviewPaymentSchema = z.object({
  note: z.string().max(500).optional(),
});

export const rejectPaymentSchema = z.object({
  note: z.string().min(1, 'Alasan penolakan wajib diisi').max(500),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  paymentTypeId: z.string().optional(),
  userId: z.string().optional(),
  period: z.string().regex(PERIOD_REGEX).optional(),
  search: z.string().max(100).optional(),
});

export const arrearsQuerySchema = z.object({
  paymentTypeId: z.string().min(1, 'Jenis pembayaran wajib dipilih'),
  userId: z.string().optional(),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type ArrearsQuery = z.infer<typeof arrearsQuerySchema>;
