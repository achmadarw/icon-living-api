import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import { logger } from '../utils/logger';
import { LoginAttemptsService } from '../services/login-attempts.service';
import { LoginAttemptsExceededError } from '../utils/errors';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      logger.separator();
      logger.info('🔐 LOGIN REQUEST RECEIVED');
      logger.step(1, 'Extracting credentials from request body');
      logger.debug('Username:', req.body.username);
      logger.debug('Password length:', req.body.password?.length || 0);
      
      // ─── Check if user is locked out ──────────────────────────────────
      const lockoutTime = LoginAttemptsService.isLockedOut(req.body.username);
      if (lockoutTime !== null) {
        logger.warn('🔒 LOGIN LOCKED OUT - too many failed attempts', {
          username: req.body.username,
          remainingSeconds: lockoutTime,
        });
        return next(new LoginAttemptsExceededError(lockoutTime));
      }
      
      const result = await authService.login(req.body);
      
      // ─── Clear attempts on successful login ──────────────────────────
      LoginAttemptsService.clearAttempts(req.body.username);
      
      logger.step(4, 'Sending success response');
      logger.success('✅ LOGIN SUCCESSFUL', {
        userId: result.user.id,
        role: result.user.role,
      });
      logger.separator();
      
      sendSuccess(res, result);
    } catch (err) {
      // ─── Record failed attempt on login error ────────────────────────
      if (req.body.username) {
        LoginAttemptsService.recordFailedAttempt(req.body.username);
        const attemptCount = LoginAttemptsService.getAttemptCount(req.body.username);
        logger.debug('Failed login attempt recorded', {
          username: req.body.username,
          attemptCount,
        });
      }
      
      logger.error('❌ LOGIN FAILED', err);
      logger.separator();
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('🔄 REFRESH TOKEN REQUEST RECEIVED');
      logger.debug('Refresh token:', `${req.body.refreshToken?.substring(0, 20)}...`);
      
      const result = await authService.refresh(req.body.refreshToken);
      
      logger.success('✅ TOKEN REFRESH SUCCESSFUL');
      sendSuccess(res, result);
    } catch (err) {
      logger.error('❌ TOKEN REFRESH FAILED', err);
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('🚪 LOGOUT REQUEST RECEIVED');
      logger.debug('Refresh token:', `${req.body.refreshToken?.substring(0, 20)}...`);
      
      await authService.logout(req.body.refreshToken);
      
      logger.success('✅ LOGOUT SUCCESSFUL');
      sendNoContent(res);
    } catch (err) {
      logger.error('❌ LOGOUT FAILED', err);
      next(err);
    }
  }
}

export const authController = new AuthController();
