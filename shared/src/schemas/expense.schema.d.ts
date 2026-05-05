import { z } from 'zod';
export declare const createExpenseSchema: z.ZodObject<{
    categoryId: z.ZodString;
    amount: z.ZodNumber;
    description: z.ZodString;
    attachmentUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    amount: number;
    categoryId: string;
    attachmentUrl?: string | undefined;
}, {
    description: string;
    amount: number;
    categoryId: string;
    attachmentUrl?: string | undefined;
}>;
export declare const approveExpenseSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export declare const rejectExpenseSchema: z.ZodObject<{
    note: z.ZodString;
}, "strip", z.ZodTypeAny, {
    note: string;
}, {
    note: string;
}>;
export declare const expenseQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]>>;
    categoryId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "APPROVED" | "REJECTED" | "DRAFT" | "SUBMITTED" | undefined;
    categoryId?: string | undefined;
}, {
    status?: "APPROVED" | "REJECTED" | "DRAFT" | "SUBMITTED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    categoryId?: string | undefined;
}>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
