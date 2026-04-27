import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('../lib/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('refresh-token'),
  verifyRefreshToken: vi.fn(),
}));

import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  username: 'testuser',
  phone: null,
  passwordHash: 'hashed-pw',
  role: 'WARGA' as const,
  address: null,
  unitNumber: 'A-01',
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({ username: 'testuser', password: 'password123' });

      expect(result.user.username).toBe('testuser');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.login({ username: 'nouser', password: 'pw' }))
        .rejects.toThrow('Username atau password salah');
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.login({ username: 'testuser', password: 'pw' }))
        .rejects.toThrow('Username atau password salah');
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(authService.login({ username: 'testuser', password: 'wrong' }))
        .rejects.toThrow('Username atau password salah');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      (verifyRefreshToken as any).mockReturnValue({ userId: 'user-1', role: 'WARGA' });
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'old-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 1000000),
      });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.$transaction.mockResolvedValue([]);

      const result = await authService.refresh('old-token');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      (verifyRefreshToken as any).mockImplementation(() => { throw new Error(); });

      await expect(authService.refresh('bad-token'))
        .rejects.toThrow('Refresh token tidak valid');
    });

    it('should throw UnauthorizedError for expired stored token', async () => {
      (verifyRefreshToken as any).mockReturnValue({ userId: 'user-1', role: 'WARGA' });
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'old-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000000),
      });

      await expect(authService.refresh('old-token'))
        .rejects.toThrow('Refresh token tidak valid atau sudah kadaluarsa');
    });
  });

  describe('logout', () => {
    it('should delete refresh token if exists', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', token: 'token' });
      prismaMock.refreshToken.delete.mockResolvedValue({});

      await authService.logout('token');

      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });

    it('should not throw if token does not exist', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.logout('nonexistent')).resolves.not.toThrow();
    });
  });
});
