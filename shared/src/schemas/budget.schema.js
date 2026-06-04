"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetVsActualQuerySchema = exports.budgetQuerySchema = exports.updateBudgetSchema = exports.createBudgetSchema = exports.cyclesPerYear = exports.budgetFrequencyEnum = void 0;
const zod_1 = require("zod");
exports.budgetFrequencyEnum = zod_1.z.enum(['MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY']);
// Jumlah siklus per tahun berdasarkan frekuensi.
exports.cyclesPerYear = {
    MONTHLY: 12,
    BIMONTHLY: 6,
    QUARTERLY: 4,
    YEARLY: 1,
};
exports.createBudgetSchema = zod_1.z.object({
    categoryId: zod_1.z.string().min(1, 'Kategori wajib dipilih'),
    year: zod_1.z.number().int().min(2020).max(2100),
    amountPerCycle: zod_1.z.number().nonnegative('Nominal tidak boleh negatif'),
    frequency: exports.budgetFrequencyEnum,
    note: zod_1.z.string().max(255).optional().nullable(),
});
exports.updateBudgetSchema = exports.createBudgetSchema.partial().omit({ categoryId: true, year: true });
exports.budgetQuerySchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2020).max(2100).optional(),
    categoryId: zod_1.z.string().optional(),
});
exports.budgetVsActualQuerySchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
});
//# sourceMappingURL=budget.schema.js.map