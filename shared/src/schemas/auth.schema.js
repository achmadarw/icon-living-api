"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setActivationPasswordSchema = exports.verifyActivationOtpSchema = exports.requestActivationOtpSchema = exports.activationUnitsQuerySchema = exports.deleteFcmTokenSchema = exports.fcmTokenSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const USERNAME_REGEX = /^[a-z0-9_]+$/;
exports.loginSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username minimal 3 karakter')
        .max(50, 'Username maksimal 50 karakter')
        .regex(USERNAME_REGEX, 'Username hanya boleh huruf kecil, angka, dan underscore'),
    password: zod_1.z.string().min(8, 'Password minimal 8 karakter'),
    fcmToken: zod_1.z.string().optional(),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token diperlukan'),
});
exports.fcmTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token diperlukan'),
    platform: zod_1.z.enum(['ANDROID', 'IOS', 'WEB']),
});
exports.deleteFcmTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token diperlukan'),
});
exports.activationUnitsQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
});
exports.requestActivationOtpSchema = zod_1.z.object({
    unitNumber: zod_1.z.string().min(2, 'Nomor rumah diperlukan'),
});
exports.verifyActivationOtpSchema = zod_1.z.object({
    unitNumber: zod_1.z.string().min(2, 'Nomor rumah diperlukan'),
    otp: zod_1.z.string().min(4, 'OTP tidak valid').max(8, 'OTP tidak valid'),
});
exports.setActivationPasswordSchema = zod_1.z.object({
    unitNumber: zod_1.z.string().min(2, 'Nomor rumah diperlukan'),
    activationToken: zod_1.z.string().min(10, 'Activation token tidak valid'),
    password: zod_1.z.string().min(8, 'Password minimal 8 karakter'),
});
//# sourceMappingURL=auth.schema.js.map