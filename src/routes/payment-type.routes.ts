import { Router, type Router as RouterType } from 'express';
import { paymentTypeController } from '../controllers/payment-type.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createPaymentTypeSchema, updatePaymentTypeSchema, idParamSchema } from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

router.get('/', (req, res, next) => paymentTypeController.findAll(req, res, next));
router.get('/:id', validate(idParamSchema, 'params'), (req, res, next) => paymentTypeController.findById(req, res, next));

// Admin only
router.post('/', authorize('KETUA', 'BENDAHARA'), validate(createPaymentTypeSchema), (req, res, next) => paymentTypeController.create(req, res, next));
router.patch('/:id', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), validate(updatePaymentTypeSchema), (req, res, next) => paymentTypeController.update(req, res, next));
router.delete('/:id', authorize('KETUA'), validate(idParamSchema, 'params'), (req, res, next) => paymentTypeController.delete(req, res, next));

export default router;
