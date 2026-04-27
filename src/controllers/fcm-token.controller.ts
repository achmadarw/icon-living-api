import type { Request, Response, NextFunction } from 'express';
import { fcmTokenService } from '../services/fcm-token.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import { logger } from '../utils/logger';

export class FcmTokenController {
  /**
   * POST /v1/auth/fcm-token
   * Body: { token: string, platform: 'ANDROID' | 'IOS' | 'WEB' }
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { token, platform } = req.body as { token: string; platform: 'ANDROID' | 'IOS' | 'WEB' };
      
      logger.info('📱 FCM TOKEN REGISTRATION REQUEST');
      logger.step(1, 'Extracting FCM token details', {
        userId,
        platform,
        tokenLength: token.length,
      });
      
      const saved = await fcmTokenService.register(userId, token, platform);
      
      logger.success('✅ FCM TOKEN REGISTERED SUCCESSFULLY', {
        tokenId: saved.id,
        userId,
        platform,
      });
      
      return sendSuccess(res, { id: saved.id }, 201);
    } catch (err) {
      logger.error('❌ FCM TOKEN REGISTRATION FAILED', err);
      next(err);
    }
  }

  /**
   * DELETE /v1/auth/fcm-token
   * Body: { token: string }
   * Dipanggil saat user logout dari satu device (menghapus hanya token itu).
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body as { token: string };
      
      logger.info('📱 FCM TOKEN REMOVAL REQUEST');
      logger.step(1, 'Removing FCM token', {
        tokenLength: token.length,
      });
      
      await fcmTokenService.remove(token);
      
      logger.success('✅ FCM TOKEN REMOVED SUCCESSFULLY');
      
      return sendNoContent(res);
    } catch (err) {
      logger.error('❌ FCM TOKEN REMOVAL FAILED', err);
      next(err);
    }
  }
}

export const fcmTokenController = new FcmTokenController();
