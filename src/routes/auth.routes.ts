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
import {
  activationUnitsQuerySchema,
  requestActivationOtpSchema,
  verifyActivationOtpSchema,
  setActivationPasswordSchema,
} from '../../shared/src/schemas/auth.schema';

const router: RouterType = Router();

router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', authenticate, validate(refreshTokenSchema), (req, res, next) => authController.logout(req, res, next));
router.get('/activation/units', validate(activationUnitsQuerySchema, 'query'), (req, res, next) => authController.activationUnits(req, res, next));
router.post('/activation/request-otp', validate(requestActivationOtpSchema), (req, res, next) => authController.requestActivationOtp(req, res, next));
router.post('/activation/verify-otp', validate(verifyActivationOtpSchema), (req, res, next) => authController.verifyActivationOtp(req, res, next));
router.post('/activation/set-password', validate(setActivationPasswordSchema), (req, res, next) => authController.setActivationPassword(req, res, next));

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
