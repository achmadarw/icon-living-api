import type { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess, buildPaginationMeta } from '../utils/response';

export class NotificationController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { notifications, total, unreadCount } = await notificationService.findByUser(userId, req.query as any);

      const { page = 1, limit = 20 } = req.query as any;
      const meta = buildPaginationMeta(Number(page), Number(limit), total);

      return sendSuccess(res, { notifications, unreadCount }, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);
      return sendSuccess(res, { unreadCount: count });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await notificationService.markAsRead(id, userId);
      return sendSuccess(res, { message: 'Notifikasi ditandai sudah dibaca' });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await notificationService.markAllAsRead(userId);
      return sendSuccess(res, { message: 'Semua notifikasi ditandai sudah dibaca' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
