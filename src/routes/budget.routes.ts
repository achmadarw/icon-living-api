import { Router, type Router as RouterType } from 'express';
import { budgetController } from '../controllers/budget.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema,
  idParamSchema,
} from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

router.get(
  '/',
  validate(budgetQuerySchema, 'query'),
  (req, res, next) => budgetController.list(req, res, next),
);

router.post(
  '/',
  authorize('KETUA', 'BENDAHARA'),
  validate(createBudgetSchema),
  (req, res, next) => budgetController.create(req, res, next),
);

router.patch(
  '/:id',
  authorize('KETUA', 'BENDAHARA'),
  validate(idParamSchema, 'params'),
  validate(updateBudgetSchema),
  (req, res, next) => budgetController.update(req, res, next),
);

router.delete(
  '/:id',
  authorize('KETUA', 'BENDAHARA'),
  validate(idParamSchema, 'params'),
  (req, res, next) => budgetController.remove(req, res, next),
);

export default router;
