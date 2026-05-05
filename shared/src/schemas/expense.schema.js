"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseQuerySchema = exports.rejectExpenseSchema = exports.approveExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
exports.createExpenseSchema = zod_1.z.object({
    categoryId: zod_1.z.string().min(1, 'Kategori pengeluaran wajib dipilih'),
    amount: zod_1.z.number().positive('Nominal harus lebih dari 0'),
    description: zod_1.z.string().min(10, 'Deskripsi minimal 10 karakter').max(1000),
    attachmentUrl: zod_1.z.string().url('URL lampiran tidak valid').optional(),
});
exports.approveExpenseSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.rejectExpenseSchema = zod_1.z.object({
    note: zod_1.z.string().min(1, 'Alasan penolakan wajib diisi').max(500),
});
exports.expenseQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    status: zod_1.z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
    categoryId: zod_1.z.string().optional(),
});
//# sourceMappingURL=expense.schema.js.map