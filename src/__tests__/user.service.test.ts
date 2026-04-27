import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('hashed-new-pw'),
  },
}));

import bcrypt from 'bcryptjs';
import { UserService } from '../services/user.service';

const userService = new UserService();

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  username: 'testuser',
  phone: '081234567890',
  passwordHash: 'hashed-pw',
  role: 'WARGA' as const,
  address: 'Jl Test',
  unitNumber: 'A-01',
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userSelect = {
  id: true, name: true, username: true, phone: true,
  role: true, address: true, unitNumber: true, avatarUrl: true,
  isActive: true, createdAt: true, updatedAt: true,
};

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await userService.create({
        name: 'Test User',
        username: 'testuser',
        password: 'password123',
        role: 'WARGA',
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.username).toBe('testuser');
    });

    it('should throw DuplicateError for existing username', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(userService.create({
        name: 'Test', username: 'testuser', password: 'pw123456', role: 'WARGA',
      })).rejects.toThrow('Username sudah terdaftar');
    });

    it('should throw DuplicateUnitError for existing unit', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(mockUser); // unit check

      await expect(userService.create({
        name: 'Test', username: 'newuser', password: 'pw123456', role: 'WARGA', unitNumber: 'A-01',
      })).rejects.toThrow('Unit sudah terdaftar');
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      prismaMock.$transaction.mockResolvedValue([[mockUser], 1]);

      const result = await userService.findAll(1, 20);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const { passwordHash, ...userWithout } = mockUser;
      prismaMock.user.findUnique.mockResolvedValue(userWithout);

      const result = await userService.findById('user-1');
      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundError for missing user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(userService.findById('nonexistent'))
        .rejects.toThrow('User tidak ditemukan');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue(mockUser);

      await expect(userService.changePassword('user-1', {
        currentPassword: 'old', newPassword: 'newpassword123',
      })).resolves.not.toThrow();
    });

    it('should throw UnauthorizedError for wrong current password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(userService.changePassword('user-1', {
        currentPassword: 'wrong', newPassword: 'newpassword123',
      })).rejects.toThrow('Password lama salah');
    });
  });

  describe('toggleActive', () => {
    it('should toggle user active status', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await userService.toggleActive('user-1');
      expect(result.isActive).toBe(false);
    });
  });
});
