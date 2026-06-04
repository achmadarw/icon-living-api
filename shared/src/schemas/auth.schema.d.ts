import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    fcmToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    fcmToken?: string | undefined;
}, {
    username: string;
    password: string;
    fcmToken?: string | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const fcmTokenSchema: z.ZodObject<{
    token: z.ZodString;
    platform: z.ZodEnum<["ANDROID", "IOS", "WEB"]>;
}, "strip", z.ZodTypeAny, {
    token: string;
    platform: "ANDROID" | "IOS" | "WEB";
}, {
    token: string;
    platform: "ANDROID" | "IOS" | "WEB";
}>;
export declare const deleteFcmTokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const activationUnitsQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
}, {
    q?: string | undefined;
}>;
export declare const requestActivationOtpSchema: z.ZodObject<{
    unitNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    unitNumber: string;
}, {
    unitNumber: string;
}>;
export declare const verifyActivationOtpSchema: z.ZodObject<{
    unitNumber: z.ZodString;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    unitNumber: string;
    otp: string;
}, {
    unitNumber: string;
    otp: string;
}>;
export declare const setActivationPasswordSchema: z.ZodObject<{
    unitNumber: z.ZodString;
    activationToken: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    unitNumber: string;
    activationToken: string;
}, {
    password: string;
    unitNumber: string;
    activationToken: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;
export type DeleteFcmTokenInput = z.infer<typeof deleteFcmTokenSchema>;
export type ActivationUnitsQuery = z.infer<typeof activationUnitsQuerySchema>;
export type RequestActivationOtpInput = z.infer<typeof requestActivationOtpSchema>;
export type VerifyActivationOtpInput = z.infer<typeof verifyActivationOtpSchema>;
export type SetActivationPasswordInput = z.infer<typeof setActivationPasswordSchema>;
//# sourceMappingURL=auth.schema.d.ts.map