import { Router, type Router as RouterType } from 'express';
import { authController } from '../controllers/auth.controller';
import { fcmTokenController } from '../controllers/fcm-token.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import {
  loginSchema,
  refreshTokenSchema,
  fcmTokenSchema,
  deleteFcmTokenSchema,
} from '@tia/shared';

const router: RouterType = Router();

router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', authenticate, validate(refreshTokenSchema), (req, res, next) => authController.logout(req, res, next));

// ─── FCM Device Token (Push Notification) ────────────────
router.post(
  '/fcm-token',
  authenticate,
  validate(fcmTokenSchema),
  (req, res, next) => fcmTokenController.register(req, res, next),
);
router.delete(
  '/fcm-token',
  authenticate,
  validate(deleteFcmTokenSchema),
  (req, res, next) => fcmTokenController.remove(req, res, next),
);

export default router;
