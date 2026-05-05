"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentTypeSchema = exports.createPaymentTypeSchema = void 0;
const zod_1 = require("zod");
exports.createPaymentTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama jenis pembayaran wajib diisi').max(100),
    description: zod_1.z.string().max(255).optional(),
    fixedAmount: zod_1.z.number().positive('Nominal harus lebih dari 0').nullable().optional(),
    isMandatory: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
exports.updatePaymentTypeSchema = exports.createPaymentTypeSchema.partial();
//# sourceMappingURL=payment-type.schema.js.map