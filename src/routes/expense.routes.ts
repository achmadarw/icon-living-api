import { Router, type Router as RouterType } from 'express';
import { expenseController } from '../controllers/expense.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createExpenseSchema, approveExpenseSchema, rejectExpenseSchema,
  expenseQuerySchema, idParamSchema,
} from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

router.post('/', authorize('KETUA', 'BENDAHARA'), validate(createExpenseSchema), (req, res, next) => expenseController.create(req, res, next));
router.get('/', authorize('KETUA', 'BENDAHARA'), validate(expenseQuerySchema, 'query'), (req, res, next) => expenseController.findAll(req, res, next));
router.get('/:id', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), (req, res, next) => expenseController.findById(req, res, next));
router.patch('/:id/approve', authorize('KETUA'), validate(idParamSchema, 'params'), validate(approveExpenseSchema), (req, res, next) => expenseController.approve(req, res, next));
router.patch('/:id/reject', authorize('KETUA'), validate(idParamSchema, 'params'), validate(rejectExpenseSchema), (req, res, next) => expenseController.reject(req, res, next));

export default router;
