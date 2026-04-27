import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { notificationQuerySchema, idParamSchema } from '@tia/shared';
import { notificationController } from '../controllers/notification.controller';

const router: RouterType = Router();

router.get(
  '/',
  authenticate,
  validate(notificationQuerySchema, 'query'),
  (req, res, next) => notificationController.findAll(req, res, next),
);

router.get(
  '/unread-count',
  authenticate,
  (req, res, next) => notificationController.getUnreadCount(req, res, next),
);

router.patch(
  '/read-all',
  authenticate,
  (req, res, next) => notificationController.markAllAsRead(req, res, next),
);

router.patch(
  '/:id/read',
  authenticate,
  validate(idParamSchema, 'params'),
  (req, res, next) => notificationController.markAsRead(req, res, next),
);

export default router;
