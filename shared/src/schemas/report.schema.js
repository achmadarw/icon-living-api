"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseExportQuerySchema = exports.incomeExportQuerySchema = exports.iplExportQuerySchema = exports.expenseReportQuerySchema = exports.incomeReportQuerySchema = exports.reportFormatSchema = exports.iplMonthlyQuerySchema = void 0;
const zod_1 = require("zod");
// ─── IPL Monthly Report ─────────────────────────────────
exports.iplMonthlyQuerySchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
});
// ─── Report Export Format ────────────────────────────────
exports.reportFormatSchema = zod_1.z.enum(['pdf', 'csv']).default('pdf');
// ─── Income Report ───────────────────────────────────────
exports.incomeReportQuerySchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    paymentTypeId: zod_1.z.string().optional(),
});
// ─── Expense Report ──────────────────────────────────────
exports.expenseReportQuerySchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    categoryId: zod_1.z.string().optional(),
});
// ─── Export Query (extends the report query + format) ────
exports.iplExportQuerySchema = exports.iplMonthlyQuerySchema.extend({
    format: exports.reportFormatSchema,
});
exports.incomeExportQuerySchema = exports.incomeReportQuerySchema.extend({
    format: exports.reportFormatSchema,
});
exports.expenseExportQuerySchema = exports.expenseReportQuerySchema.extend({
    format: exports.reportFormatSchema,
});
//# sourceMappingURL=report.schema.js.map