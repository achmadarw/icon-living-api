import { Router, type Router as RouterType } from 'express';
import { userController } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createUserSchema, updateUserSchema, updateProfileSchema,
  changePasswordSchema, resetPasswordSchema, paginationSchema, idParamSchema,
} from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

// Profile routes (any authenticated user)
router.get('/me', (req, res, next) => userController.findMe(req, res, next));
router.patch('/me', validate(updateProfileSchema), (req, res, next) => userController.updateProfile(req, res, next));
router.patch('/me/password', validate(changePasswordSchema), (req, res, next) => userController.changePassword(req, res, next));

// Admin routes (KETUA only)
router.post('/', authorize('KETUA'), validate(createUserSchema), (req, res, next) => userController.create(req, res, next));
router.get('/', authorize('KETUA', 'BENDAHARA'), validate(paginationSchema, 'query'), (req, res, next) => userController.findAll(req, res, next));
router.get('/:id', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), (req, res, next) => userController.findById(req, res, next));
router.patch('/:id', authorize('KETUA'), validate(idParamSchema, 'params'), validate(updateUserSchema), (req, res, next) => userController.update(req, res, next));
router.patch('/:id/reset-password', authorize('KETUA'), validate(idParamSchema, 'params'), validate(resetPasswordSchema), (req, res, next) => userController.resetPassword(req, res, next));
router.patch('/:id/toggle-active', authorize('KETUA'), validate(idParamSchema, 'params'), (req, res, next) => userController.toggleActive(req, res, next));

export default router;
