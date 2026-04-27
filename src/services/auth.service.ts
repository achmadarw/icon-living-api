import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { UnauthorizedError } from '../utils/errors';
import { AUTH } from '@tia/shared';
import { logger } from '../utils/logger';
import type { LoginInput } from '@tia/shared';

export class AuthService {
  async login(input: LoginInput) {
    logger.step(2, 'Querying database for user', `username: ${input.username}`);
    
    const user = await prisma.user.findUnique({
      where: { username: input.username },
    });

    if (!user) {
      logger.warn('User not found in database', input.username);
      throw new UnauthorizedError('Username atau password salah');
    }

    if (!user.isActive) {
      logger.warn('User is inactive', {
        userId: user.id,
        username: user.username,
        isActive: user.isActive,
      });
      throw new UnauthorizedError('Username atau password salah');
    }

    logger.debug('User found in database', {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    });

    logger.step(3, 'Validating password with bcrypt');
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    
    logger.debug('Password validation result', isValid ? 'VALID ✓' : 'INVALID ✗');
    
    if (!isValid) {
      logger.warn('Password validation failed', {
        username: user.username,
        passwordLength: input.password.length,
      });
      throw new UnauthorizedError('Username atau password salah');
    }

    logger.debug('Password is valid, generating tokens...');
    
    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.debug('Tokens generated', {
      accessToken: `${accessToken.substring(0, 20)}...`,
      refreshToken: `${refreshToken.substring(0, 20)}...`,
    });

    logger.debug('Saving refresh token to database', {
      userId: user.id,
      expiresIn: `${AUTH.REFRESH_TOKEN_EXPIRES_IN_MS / 1000 / 60 / 60 / 24} days`,
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + AUTH.REFRESH_TOKEN_EXPIRES_IN_MS),
      },
    });

    logger.debug('Refresh token saved successfully');

    const { passwordHash, ...userWithoutPassword } = user;

    logger.debug('Preparing response data', {
      user: {
        id: userWithoutPassword.id,
        username: userWithoutPassword.username,
        role: userWithoutPassword.role,
      },
    });

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async refresh(token: string) {
    logger.debug('Step 1: Verifying refresh token signature');
    
    let payload;
    try {
      payload = verifyRefreshToken(token);
      logger.debug('Token signature verified', { userId: payload.userId, role: payload.role });
    } catch (error) {
      logger.warn('Refresh token verification failed');
      throw new UnauthorizedError('Refresh token tidak valid');
    }

    logger.debug('Step 2: Checking refresh token in database');
    
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      logger.warn('Refresh token not found in database');
      throw new UnauthorizedError('Refresh token tidak valid atau sudah kadaluarsa');
    }

    if (storedToken.expiresAt < new Date()) {
      logger.warn('Refresh token has expired', {
        expiresAt: storedToken.expiresAt,
        now: new Date(),
      });
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token tidak valid atau sudah kadaluarsa');
    }

    logger.debug('Refresh token is valid and not expired');
    logger.debug('Step 3: Fetching user data');

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      logger.warn('User not found or inactive', { userId: payload.userId });
      throw new UnauthorizedError('User tidak aktif');
    }

    logger.debug('Step 4: Generating new tokens');
    
    const newPayload = { userId: user.id, role: user.role };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    logger.debug('Tokens generated', {
      accessToken: `${newAccessToken.substring(0, 20)}...`,
      refreshToken: `${newRefreshToken.substring(0, 20)}...`,
    });

    logger.debug('Step 5: Rotating refresh token in database');
    
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + AUTH.REFRESH_TOKEN_EXPIRES_IN_MS),
        },
      }),
    ]);

    logger.debug('Refresh token rotated successfully');

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    logger.debug('Step 1: Finding refresh token in database');
    
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      logger.warn('Refresh token not found during logout');
      return;
    }

    logger.debug('Step 2: Deleting refresh token from database', {
      tokenId: storedToken.id,
      userId: storedToken.userId,
    });

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    logger.debug('Refresh token deleted successfully');
  }
}

export const authService = new AuthService();
