import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { FcmTokenService } from '../services/fcm-token.service';

const service = new FcmTokenService();

describe('FcmTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should upsert a token for a user', async () => {
      const mockResult = { id: 'tok-1', userId: 'user-1', token: 'fcm-abc', platform: 'ANDROID' };
      prismaMock.fcmToken.upsert.mockResolvedValue(mockResult);

      const result = await service.register('user-1', 'fcm-abc', 'ANDROID' as any);

      expect(prismaMock.fcmToken.upsert).toHaveBeenCalledWith({
        where: { token: 'fcm-abc' },
        update: { userId: 'user-1', platform: 'ANDROID' },
        create: { userId: 'user-1', token: 'fcm-abc', platform: 'ANDROID' },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove', () => {
    it('should delete token by value', async () => {
      prismaMock.fcmToken.deleteMany.mockResolvedValue({ count: 1 });
      await service.remove('fcm-abc');
      expect(prismaMock.fcmToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'fcm-abc' },
      });
    });
  });

  describe('removeAllForUser', () => {
    it('should delete all tokens for user', async () => {
      prismaMock.fcmToken.deleteMany.mockResolvedValue({ count: 2 });
      await service.removeAllForUser('user-1');
      expect(prismaMock.fcmToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('getTokensForUsers', () => {
    it('should return empty array when no user ids', async () => {
      const result = await service.getTokensForUsers([]);
      expect(result).toEqual([]);
      expect(prismaMock.fcmToken.findMany).not.toHaveBeenCalled();
    });

    it('should return token strings for given users', async () => {
      prismaMock.fcmToken.findMany.mockResolvedValue([
        { token: 't1' },
        { token: 't2' },
      ] as any);

      const result = await service.getTokensForUsers(['user-1', 'user-2']);

      expect(result).toEqual(['t1', 't2']);
      expect(prismaMock.fcmToken.findMany).toHaveBeenCalledWith({
        where: { userId: { in: ['user-1', 'user-2'] } },
        select: { token: true },
      });
    });
  });

  describe('removeInvalidTokens', () => {
    it('should skip when empty', async () => {
      await service.removeInvalidTokens([]);
      expect(prismaMock.fcmToken.deleteMany).not.toHaveBeenCalled();
    });

    it('should bulk-delete by token list', async () => {
      prismaMock.fcmToken.deleteMany.mockResolvedValue({ count: 2 });
      await service.removeInvalidTokens(['t1', 't2']);
      expect(prismaMock.fcmToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ['t1', 't2'] } },
      });
    });
  });
});
