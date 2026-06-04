import { z } from 'zod';
export declare const budgetFrequencyEnum: z.ZodEnum<["MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]>;
export type BudgetFrequency = z.infer<typeof budgetFrequencyEnum>;
export declare const cyclesPerYear: Record<BudgetFrequency, number>;
export declare const createBudgetSchema: z.ZodObject<{
    categoryId: z.ZodString;
    year: z.ZodNumber;
    amountPerCycle: z.ZodNumber;
    frequency: z.ZodEnum<["MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]>;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    year: number;
    categoryId: string;
    amountPerCycle: number;
    frequency: "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "YEARLY";
    note?: string | null | undefined;
}, {
    year: number;
    categoryId: string;
    amountPerCycle: number;
    frequency: "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "YEARLY";
    note?: string | null | undefined;
}>;
export declare const updateBudgetSchema: z.ZodObject<Omit<{
    categoryId: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    amountPerCycle: z.ZodOptional<z.ZodNumber>;
    frequency: z.ZodOptional<z.ZodEnum<["MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]>>;
    note: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "year" | "categoryId">, "strip", z.ZodTypeAny, {
    note?: string | null | undefined;
    amountPerCycle?: number | undefined;
    frequency?: "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "YEARLY" | undefined;
}, {
    note?: string | null | undefined;
    amountPerCycle?: number | undefined;
    frequency?: "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "YEARLY" | undefined;
}>;
export declare const budgetQuerySchema: z.ZodObject<{
    year: z.ZodOptional<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    year?: number | undefined;
    categoryId?: string | undefined;
}, {
    year?: number | undefined;
    categoryId?: string | undefined;
}>;
export declare const budgetVsActualQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    year: number;
    month?: number | undefined;
}, {
    year: number;
    month?: number | undefined;
}>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
export type BudgetVsActualQuery = z.infer<typeof budgetVsActualQuerySchema>;
//# sourceMappingURL=budget.schema.d.ts.map