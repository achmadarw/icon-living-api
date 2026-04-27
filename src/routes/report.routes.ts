import { Router, type Router as RouterType } from 'express';
import { reportController } from '../controllers/report.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { exportRateLimit } from '../middleware/rate-limit';
import {
  iplMonthlyQuerySchema,
  iplExportQuerySchema,
  incomeReportQuerySchema,
  incomeExportQuerySchema,
  expenseReportQuerySchema,
  expenseExportQuerySchema,
} from '@tia/shared';

const router: RouterType = Router();

// All report endpoints require authentication + pengurus role
router.use(authenticate);
router.use(authorize('BENDAHARA', 'KETUA'));

// ─── IPL Monthly ────────────────────────────────────────
router.get(
  '/ipl-monthly',
  validate(iplMonthlyQuerySchema, 'query'),
  (req, res, next) => reportController.getIplMonthly(req, res, next),
);

router.get(
  '/ipl-monthly/export',
  exportRateLimit,
  validate(iplExportQuerySchema, 'query'),
  (req, res, next) => reportController.exportIplMonthly(req, res, next),
);

// ─── Income ─────────────────────────────────────────────
router.get(
  '/income',
  validate(incomeReportQuerySchema, 'query'),
  (req, res, next) => reportController.getIncomeReport(req, res, next),
);

router.get(
  '/income/export',
  exportRateLimit,
  validate(incomeExportQuerySchema, 'query'),
  (req, res, next) => reportController.exportIncome(req, res, next),
);

// ─── Expenses ───────────────────────────────────────────
router.get(
  '/expenses',
  validate(expenseReportQuerySchema, 'query'),
  (req, res, next) => reportController.getExpenseReport(req, res, next),
);

router.get(
  '/expenses/export',
  exportRateLimit,
  validate(expenseExportQuerySchema, 'query'),
  (req, res, next) => reportController.exportExpense(req, res, next),
);

export default router;
