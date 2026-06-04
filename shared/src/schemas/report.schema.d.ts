import { z } from 'zod';
export declare const iplMonthlyQuerySchema: z.ZodObject<{
    month: z.ZodNumber;
    year: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    year: number;
    month: number;
}, {
    year: number;
    month: number;
}>;
export type IplMonthlyQuery = z.infer<typeof iplMonthlyQuerySchema>;
export declare const reportFormatSchema: z.ZodDefault<z.ZodEnum<["pdf", "csv"]>>;
export type ReportFormat = z.infer<typeof reportFormatSchema>;
export declare const incomeReportQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
    paymentTypeId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    year: number;
    paymentTypeId?: string | undefined;
    month?: number | undefined;
}, {
    year: number;
    paymentTypeId?: string | undefined;
    month?: number | undefined;
}>;
export type IncomeReportQuery = z.infer<typeof incomeReportQuerySchema>;
export declare const expenseReportQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    year: number;
    categoryId?: string | undefined;
    month?: number | undefined;
}, {
    year: number;
    categoryId?: string | undefined;
    month?: number | undefined;
}>;
export type ExpenseReportQuery = z.infer<typeof expenseReportQuerySchema>;
export declare const iplExportQuerySchema: z.ZodObject<{
    month: z.ZodNumber;
    year: z.ZodNumber;
} & {
    format: z.ZodDefault<z.ZodEnum<["pdf", "csv"]>>;
}, "strip", z.ZodTypeAny, {
    year: number;
    month: number;
    format: "pdf" | "csv";
}, {
    year: number;
    month: number;
    format?: "pdf" | "csv" | undefined;
}>;
export type IplExportQuery = z.infer<typeof iplExportQuerySchema>;
export declare const incomeExportQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
    paymentTypeId: z.ZodOptional<z.ZodString>;
} & {
    format: z.ZodDefault<z.ZodEnum<["pdf", "csv"]>>;
}, "strip", z.ZodTypeAny, {
    year: number;
    format: "pdf" | "csv";
    paymentTypeId?: string | undefined;
    month?: number | undefined;
}, {
    year: number;
    paymentTypeId?: string | undefined;
    month?: number | undefined;
    format?: "pdf" | "csv" | undefined;
}>;
export type IncomeExportQuery = z.infer<typeof incomeExportQuerySchema>;
export declare const expenseExportQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodString>;
} & {
    format: z.ZodDefault<z.ZodEnum<["pdf", "csv"]>>;
}, "strip", z.ZodTypeAny, {
    year: number;
    format: "pdf" | "csv";
    categoryId?: string | undefined;
    month?: number | undefined;
}, {
    year: number;
    categoryId?: string | undefined;
    month?: number | undefined;
    format?: "pdf" | "csv" | undefined;
}>;
export type ExpenseExportQuery = z.infer<typeof expenseExportQuerySchema>;
//# sourceMappingURL=report.schema.d.ts.map