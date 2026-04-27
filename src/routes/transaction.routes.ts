import { Router, type Router as RouterType } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { paginationSchema } from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

// Dashboard & summary endpoints — accessible by all authenticated roles
router.get('/balance', (req, res, next) => transactionController.getBalance(req, res, next));
router.get('/summary', (req, res, next) => transactionController.getSummary(req, res, next));
router.get('/cash-flow', (req, res, next) => transactionController.getCashFlow(req, res, next));
router.get('/dashboard', (req, res, next) => transactionController.getDashboard(req, res, next));

// Transaction list — accessible by all authenticated roles
router.get('/', validate(paginationSchema, 'query'), (req, res, next) => transactionController.findAll(req, res, next));

export default router;
