"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const USERNAME_REGEX = /^[a-z0-9_]+$/;
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    username: zod_1.z
        .string()
        .min(3, 'Username minimal 3 karakter')
        .max(50, 'Username maksimal 50 karakter')
        .regex(USERNAME_REGEX, 'Username hanya boleh huruf kecil, angka, dan underscore'),
    password: zod_1.z.string().min(8, 'Password minimal 8 karakter'),
    phone: zod_1.z.string().max(20).optional(),
    role: zod_1.z.enum(['WARGA', 'BENDAHARA', 'KETUA']),
    unitNumber: zod_1.z.string().max(20).optional(),
    address: zod_1.z.string().max(255).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    phone: zod_1.z.string().max(20).optional(),
    unitNumber: zod_1.z.string().max(20).optional(),
    role: zod_1.z.enum(['WARGA', 'BENDAHARA', 'KETUA']).optional(),
    address: zod_1.z.string().max(255).optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    phone: zod_1.z.string().max(20).optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Password lama wajib diisi'),
    newPassword: zod_1.z.string().min(8, 'Password baru minimal 8 karakter'),
});
exports.resetPasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(8, 'Password baru minimal 8 karakter'),
});
//# sourceMappingURL=user.schema.js.map