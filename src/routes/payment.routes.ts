import { Router, type Router as RouterType } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createPaymentSchema, reviewPaymentSchema, rejectPaymentSchema,
  paymentQuerySchema, arrearsQuerySchema, idParamSchema,
} from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

// Warga: own payments
router.post('/', validate(createPaymentSchema), (req, res, next) => paymentController.create(req, res, next));
router.get('/mine', validate(paymentQuerySchema, 'query'), (req, res, next) => paymentController.findMine(req, res, next));

// Arrears: all authenticated users can check
router.get('/arrears', validate(arrearsQuerySchema, 'query'), (req, res, next) => paymentController.getArrears(req, res, next));

// Pengurus: all payments
router.get('/', authorize('KETUA', 'BENDAHARA'), validate(paymentQuerySchema, 'query'), (req, res, next) => paymentController.findAll(req, res, next));
router.get('/:id', validate(idParamSchema, 'params'), (req, res, next) => paymentController.findById(req, res, next));
router.patch('/:id/approve', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), validate(reviewPaymentSchema), (req, res, next) => paymentController.approve(req, res, next));
router.patch('/:id/reject', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), validate(rejectPaymentSchema), (req, res, next) => paymentController.reject(req, res, next));

export default router;
