"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseCategorySchema = exports.createExpenseCategorySchema = void 0;
const zod_1 = require("zod");
exports.createExpenseCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama kategori wajib diisi').max(100),
    description: zod_1.z.string().max(255).optional(),
    requiresApproval: zod_1.z.boolean().default(true),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateExpenseCategorySchema = exports.createExpenseCategorySchema.partial();
//# sourceMappingURL=expense-category.schema.js.map