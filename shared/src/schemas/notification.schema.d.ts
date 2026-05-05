import { z } from 'zod';
export declare const notificationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    isRead: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    isRead?: boolean | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    isRead?: "true" | "false" | undefined;
}>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
