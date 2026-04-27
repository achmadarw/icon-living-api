import { z } from 'zod';

// ─── IPL Monthly Report ─────────────────────────────────
export const iplMonthlyQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type IplMonthlyQuery = z.infer<typeof iplMonthlyQuerySchema>;

// ─── Report Export Format ────────────────────────────────
export const reportFormatSchema = z.enum(['pdf', 'csv']).default('pdf');

export type ReportFormat = z.infer<typeof reportFormatSchema>;

// ─── Income Report ───────────────────────────────────────
export const incomeReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  paymentTypeId: z.string().optional(),
});

export type IncomeReportQuery = z.infer<typeof incomeReportQuerySchema>;

// ─── Expense Report ──────────────────────────────────────
export const expenseReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  categoryId: z.string().optional(),
});

export type ExpenseReportQuery = z.infer<typeof expenseReportQuerySchema>;

// ─── Export Query (extends the report query + format) ────
export const iplExportQuerySchema = iplMonthlyQuerySchema.extend({
  format: reportFormatSchema,
});

export type IplExportQuery = z.infer<typeof iplExportQuerySchema>;

export const incomeExportQuerySchema = incomeReportQuerySchema.extend({
  format: reportFormatSchema,
});

export type IncomeExportQuery = z.infer<typeof incomeExportQuerySchema>;

export const expenseExportQuerySchema = expenseReportQuerySchema.extend({
  format: reportFormatSchema,
});

export type ExpenseExportQuery = z.infer<typeof expenseExportQuerySchema>;
