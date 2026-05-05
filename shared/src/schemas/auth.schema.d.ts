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
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;
export type DeleteFcmTokenInput = z.infer<typeof deleteFcmTokenSchema>;
