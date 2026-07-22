import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { notificationQuerySchema, idParamSchema } from '@tia/shared';
import { notificationController } from '../controllers/notification.controller';
import { z } from 'zod';

const router: RouterType = Router();

const whatsappBroadcastSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'Pilih minimal 1 penerima').max(300),
  message: z.string().trim().min(1, 'Pesan wajib diisi').max(2000, 'Pesan maksimal 2000 karakter'),
  // Jeda acak antar pesan (detik) untuk menghindari nomor diblokir. Opsional.
  delayMinSec: z.number().int().min(0).max(120).optional(),
  delayMaxSec: z.number().int().min(0).max(120).optional(),
});

router.post(
  '/whatsapp/broadcast',
  authenticate,
  authorize('KETUA', 'BENDAHARA'),
  validate(whatsappBroadcastSchema),
  (req, res, next) => notificationController.broadcastWhatsapp(req, res, next),
);

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
