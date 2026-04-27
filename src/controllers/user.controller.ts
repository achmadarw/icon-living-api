import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { buildPaginationMeta } from '../utils/response';
import { PAGINATION } from '@tia/shared';
import { logger } from '../utils/logger';

export class UserController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body);
      sendCreated(res, user);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
      const limit = Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT;
      const { users, total } = await userService.findAll(page, limit);
      const meta = buildPaginationMeta(page, limit, total);
      sendSuccess(res, users, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async findMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.changePassword(req.user!.userId, req.body);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('🔑 RESET PASSWORD REQUEST');
      logger.step(1, 'Extracting data', {
      userId: req.params.id,
      newPasswordLength: req.body.newPassword?.length || 0,
    });
    
    logger.step(2, 'Calling userService.resetPassword');
      await userService.resetPassword(req.params.id, req.body);
      sendNoContent(res);
    } catch (err) {
      logger.error('❌ PASSWORD RESET FAILED', err);
      next(err);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.toggleActive(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
