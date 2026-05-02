import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import type { DevicePlatform } from '@prisma/client';

export class FcmTokenService {
  /**
   * Register (or re-assign) an FCM token for a user.
   *
   * - If token exists for another user → re-bind to the current user (handles
   *   device handover / account switch).
   * - If token exists for the same user → just update `updatedAt`.
   * - Otherwise → create.
   */
  async register(userId: string, token: string, platform: DevicePlatform) {
    logger.step(2, 'Checking if FCM token already exists in database');
    
    const existingToken = await prisma.fcmToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      if (existingToken.userId === userId) {
        logger.debug('Token already registered for this user, updating timestamp', {
          tokenId: existingToken.id,
          userId,
          platform,
        });
      } else {
        logger.debug('Token detected from different user, re-binding to current user', {
          fromUserId: existingToken.userId,
          toUserId: userId,
          platform,
        });
      }
    } else {
      logger.debug('New FCM token, creating new record', {
        userId,
        platform,
      });
    }

    const result = await prisma.fcmToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });

    logger.step(3, 'FCM token saved to database', {
      tokenId: result.id,
      userId: result.userId,
      platform: result.platform,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });

    return result;
  }

  /**
   * Remove an FCM token (on logout or when client detects invalidation).
   * Safe to call if token does not exist.
   */
  async remove(token: string) {
    logger.step(2, 'Finding FCM token in database');
    
    const existingToken = await prisma.fcmToken.findUnique({
      where: { token },
    });

    if (!existingToken) {
      logger.warn('FCM token not found in database');
      return;
    }

    logger.step(3, 'Deleting FCM token from database', {
      tokenId: existingToken.id,
      userId: existingToken.userId,
      platform: existingToken.platform,
    });

    await prisma.fcmToken.deleteMany({ where: { token } });

    logger.debug('FCM token deleted successfully');
  }

  /**
   * Remove all tokens belonging to a user (on full account logout-all-devices).
   */
  async removeAllForUser(userId: string) {
    logger.info('🚪 LOGOUT ALL DEVICES REQUESTED');
    logger.step(1, 'Finding all FCM tokens for user', { userId });
    
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { id: true, platform: true },
    });

    logger.debug(`Found ${tokens.length} FCM token(s)`, {
      userId,
      tokens: tokens.map(t => ({ id: t.id, platform: t.platform })),
    });

    if (tokens.length > 0) {
      logger.step(2, `Deleting ${tokens.length} FCM token(s) from database`);
      await prisma.fcmToken.deleteMany({ where: { userId } });
      logger.success('✅ All FCM tokens deleted successfully');
    } else {
      logger.debug('No FCM tokens found for this user');
    }
  }

  /**
   * Get all tokens for a list of users — used by notification service when
   * dispatching push to multiple recipients (e.g. all BENDAHARA).
   */
  async getTokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      console.log('[fcm-token.getTokensForUsers] ⚠️ EMPTY USER IDS');
      return [];
    }

    console.log('[fcm-token.getTokensForUsers] 🔍 QUERYING FCM TOKENS', {
      userIds,
      userIdsCount: userIds.length,
    });

    const rows = await prisma.fcmToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true, userId: true },
    });

    const tokens = rows.map((r) => r.token);

    console.log('[fcm-token.getTokensForUsers] 📋 FOUND TOKENS', {
      userIds,
      tokensCount: tokens.length,
      byUser: userIds.map(uid => ({
        userId: uid,
        tokenCount: rows.filter(r => r.userId === uid).length,
      })),
    });

    if (tokens.length === 0) {
      console.warn('[fcm-token.getTokensForUsers] ⚠️ NO TOKENS FOUND for users:', userIds);
    }

    return tokens;
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    return this.getTokensForUsers([userId]);
  }

  /**
   * Bulk remove tokens that FCM reported as invalid/unregistered.
   */
  async removeInvalidTokens(tokens: string[]) {
    if (tokens.length === 0) {
      logger.debug('No invalid tokens to remove');
      return;
    }

    logger.warn('🔔 FCM INVALID TOKENS DETECTED');
    logger.step(1, `Removing ${tokens.length} invalid FCM token(s)`, {
      count: tokens.length,
    });

    const deletedCount = await prisma.fcmToken.deleteMany({
      where: { token: { in: tokens } },
    });

    logger.debug('Invalid tokens removed from database', {
      requestedCount: tokens.length,
      deletedCount: deletedCount.count,
    });
  }
}

export const fcmTokenService = new FcmTokenService();
