import { z } from 'zod';
export declare const createPaymentTypeSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    fixedAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isMandatory: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isMandatory: boolean;
    isActive: boolean;
    description?: string | undefined;
    fixedAmount?: number | null | undefined;
}, {
    name: string;
    description?: string | undefined;
    fixedAmount?: number | null | undefined;
    isMandatory?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
export declare const updatePaymentTypeSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    fixedAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    isMandatory: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    fixedAmount?: number | null | undefined;
    isMandatory?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    fixedAmount?: number | null | undefined;
    isMandatory?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
export type CreatePaymentTypeInput = z.infer<typeof createPaymentTypeSchema>;
export type UpdatePaymentTypeInput = z.infer<typeof updatePaymentTypeSchema>;
//# sourceMappingURL=payment-type.schema.d.ts.map