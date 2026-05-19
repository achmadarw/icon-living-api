import { Router, type Router as RouterType } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { paginationSchema } from '@tia/shared';
import { z } from 'zod';

const transactionQuerySchema = paginationSchema.extend({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'amount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const createOtherIncomeSchema = z.object({
  amount: z.number().positive(),
  description: z.string().trim().min(3).max(255),
  receivedAt: z.string().datetime().optional(),
});

const router: RouterType = Router();

router.use(authenticate);

// Dashboard & summary endpoints — accessible by all authenticated roles
router.get('/balance', (req, res, next) => transactionController.getBalance(req, res, next));
router.get('/summary', (req, res, next) => transactionController.getSummary(req, res, next));
router.get('/cash-flow', (req, res, next) => transactionController.getCashFlow(req, res, next));
router.get('/ipl-period-flow', (req, res, next) => transactionController.getIplPeriodFlow(req, res, next));
router.get('/dashboard', (req, res, next) => transactionController.getDashboard(req, res, next));

// Transaction list — accessible by all authenticated roles
router.get('/', validate(transactionQuerySchema, 'query'), (req, res, next) => transactionController.findAll(req, res, next));
router.post(
  '/other-income',
  authorize('KETUA', 'BENDAHARA'),
  validate(createOtherIncomeSchema),
  (req, res, next) => transactionController.createOtherIncome(req, res, next),
);

export default router;
