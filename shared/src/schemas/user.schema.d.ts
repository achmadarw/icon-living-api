import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["WARGA", "BENDAHARA", "KETUA"]>;
    unitNumber: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    name: string;
    role: "WARGA" | "BENDAHARA" | "KETUA";
    unitNumber?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}, {
    username: string;
    password: string;
    name: string;
    role: "WARGA" | "BENDAHARA" | "KETUA";
    unitNumber?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    unitNumber: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["WARGA", "BENDAHARA", "KETUA"]>>;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    unitNumber?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    role?: "WARGA" | "BENDAHARA" | "KETUA" | undefined;
    address?: string | undefined;
}, {
    unitNumber?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    role?: "WARGA" | "BENDAHARA" | "KETUA" | undefined;
    address?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    phone?: string | undefined;
}, {
    name?: string | undefined;
    phone?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
}, {
    newPassword: string;
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
//# sourceMappingURL=user.schema.d.ts.map