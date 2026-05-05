"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrearsQuerySchema = exports.paymentQuerySchema = exports.rejectPaymentSchema = exports.reviewPaymentSchema = exports.createPaymentSchema = void 0;
const zod_1 = require("zod");
const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
exports.createPaymentSchema = zod_1.z.object({
    paymentTypeId: zod_1.z.string().min(1, 'Jenis pembayaran wajib dipilih'),
    amount: zod_1.z.number().positive('Nominal harus lebih dari 0'),
    bankName: zod_1.z.string().min(1, 'Nama bank wajib diisi').max(100),
    accountName: zod_1.z.string().max(100).optional(),
    transferDate: zod_1.z.string().min(1, 'Tanggal transfer wajib diisi'),
    proofImageUrl: zod_1.z.string().min(1, 'URL bukti transfer wajib diisi'),
    description: zod_1.z.string().max(500).optional(),
    periods: zod_1.z
        .array(zod_1.z.string().regex(PERIOD_REGEX, 'Format periode: YYYY-MM'))
        .min(1, 'Minimal 1 periode harus dipilih')
        .max(12, 'Maksimal 12 periode sekaligus'),
});
exports.reviewPaymentSchema = zod_1.z.object({
    note: zod_1.z.string().max(500).optional(),
});
exports.rejectPaymentSchema = zod_1.z.object({
    note: zod_1.z.string().min(1, 'Alasan penolakan wajib diisi').max(500),
});
exports.paymentQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    paymentTypeId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    period: zod_1.z.string().regex(PERIOD_REGEX).optional(),
    search: zod_1.z.string().max(100).optional(),
});
exports.arrearsQuerySchema = zod_1.z.object({
    paymentTypeId: zod_1.z.string().min(1, 'Jenis pembayaran wajib dipilih'),
    userId: zod_1.z.string().optional(),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
});
//# sourceMappingURL=payment.schema.js.map