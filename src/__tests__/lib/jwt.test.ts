import { describe, it, expect } from 'vitest';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../lib/jwt';
import type { TokenPayload } from '../../lib/jwt';

describe('JWT utilities', () => {
  const testPayload: TokenPayload = {
    userId: 'user-123',
    role: 'WARGA',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT string', () => {
      const token = generateAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT string', () => {
      const token = generateRefreshToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate a different token than access token', () => {
      const access = generateAccessToken(testPayload);
      const refresh = generateRefreshToken(testPayload);
      expect(access).not.toBe(refresh);
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode and return the payload', () => {
      const token = generateAccessToken(testPayload);
      const payload = verifyAccessToken(token);
      expect(payload.userId).toBe('user-123');
      expect(payload.role).toBe('WARGA');
    });

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw for refresh token used as access token', () => {
      const refreshToken = generateRefreshToken(testPayload);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should decode and return the payload', () => {
      const token = generateRefreshToken(testPayload);
      const payload = verifyRefreshToken(token);
      expect(payload.userId).toBe('user-123');
      expect(payload.role).toBe('WARGA');
    });

    it('should throw for invalid token', () => {
      expect(() => verifyRefreshToken('invalid.token.here')).toThrow();
    });

    it('should throw for access token used as refresh token', () => {
      const accessToken = generateAccessToken(testPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('token independence', () => {
    it('should contain userId and role in both tokens', () => {
      const accessToken = generateAccessToken(testPayload);
      const refreshToken = generateRefreshToken(testPayload);

      const accessPayload = verifyAccessToken(accessToken);
      const refreshPayload = verifyRefreshToken(refreshToken);

      expect(accessPayload.userId).toBe(testPayload.userId);
      expect(refreshPayload.userId).toBe(testPayload.userId);
      expect(accessPayload.role).toBe(testPayload.role);
      expect(refreshPayload.role).toBe(testPayload.role);
    });
  });
});
