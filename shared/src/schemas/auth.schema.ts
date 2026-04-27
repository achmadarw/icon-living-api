import { z } from 'zod';

const USERNAME_REGEX = /^[a-z0-9_]+$/;

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(USERNAME_REGEX, 'Username hanya boleh huruf kecil, angka, dan underscore'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  fcmToken: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token diperlukan'),
});

export const fcmTokenSchema = z.object({
  token: z.string().min(1, 'Token diperlukan'),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']),
});

export const deleteFcmTokenSchema = z.object({
  token: z.string().min(1, 'Token diperlukan'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;
export type DeleteFcmTokenInput = z.infer<typeof deleteFcmTokenSchema>;
