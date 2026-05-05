"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFcmTokenSchema = exports.fcmTokenSchema = exports.refreshTokenSchema = exports.loginSchema = void 0;
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
//# sourceMappingURL=auth.schema.js.map