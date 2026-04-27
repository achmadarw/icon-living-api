import { z } from 'zod';

const USERNAME_REGEX = /^[a-z0-9_]+$/;

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(USERNAME_REGEX, 'Username hanya boleh huruf kecil, angka, dan underscore'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().max(20).optional(),
  role: z.enum(['WARGA', 'BENDAHARA', 'KETUA']),
  unitNumber: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  unitNumber: z.string().max(20).optional(),
  role: z.enum(['WARGA', 'BENDAHARA', 'KETUA']).optional(),
  address: z.string().max(255).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
