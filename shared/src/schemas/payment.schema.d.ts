import { z } from 'zod';
export declare const createPaymentSchema: z.ZodObject<{
    paymentTypeId: z.ZodString;
    amount: z.ZodNumber;
    bankName: z.ZodString;
    accountName: z.ZodOptional<z.ZodString>;
    transferDate: z.ZodString;
    proofImageUrl: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    periods: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    paymentTypeId: string;
    amount: number;
    bankName: string;
    transferDate: string;
    proofImageUrl: string;
    periods: string[];
    description?: string | undefined;
    accountName?: string | undefined;
}, {
    paymentTypeId: string;
    amount: number;
    bankName: string;
    transferDate: string;
    proofImageUrl: string;
    periods: string[];
    description?: string | undefined;
    accountName?: string | undefined;
}>;
export declare const createManualPaymentSchema: z.ZodObject<{
    userId: z.ZodString;
    paymentTypeId: z.ZodString;
    amount: z.ZodNumber;
    bankName: z.ZodString;
    accountName: z.ZodOptional<z.ZodString>;
    transferDate: z.ZodString;
    proofImageUrl: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    periods: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    paymentTypeId: string;
    amount: number;
    bankName: string;
    transferDate: string;
    periods: string[];
    userId: string;
    description?: string | undefined;
    accountName?: string | undefined;
    proofImageUrl?: string | undefined;
}, {
    paymentTypeId: string;
    amount: number;
    bankName: string;
    transferDate: string;
    periods: string[];
    userId: string;
    description?: string | undefined;
    accountName?: string | undefined;
    proofImageUrl?: string | undefined;
}>;
export declare const reviewPaymentSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export declare const rejectPaymentSchema: z.ZodObject<{
    note: z.ZodString;
}, "strip", z.ZodTypeAny, {
    note: string;
}, {
    note: string;
}>;
export declare const paymentQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>>;
    paymentTypeId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    period: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    paymentTypeId?: string | undefined;
    userId?: string | undefined;
    period?: string | undefined;
    search?: string | undefined;
}, {
    status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    paymentTypeId?: string | undefined;
    userId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    period?: string | undefined;
    search?: string | undefined;
}>;
export declare const arrearsQuerySchema: z.ZodObject<{
    paymentTypeId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    year: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    paymentTypeId: string;
    year: number;
    userId?: string | undefined;
}, {
    paymentTypeId: string;
    year: number;
    userId?: string | undefined;
}>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateManualPaymentInput = z.infer<typeof createManualPaymentSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
export type ArrearsQuery = z.infer<typeof arrearsQuerySchema>;
//# sourceMappingURL=payment.schema.d.ts.map