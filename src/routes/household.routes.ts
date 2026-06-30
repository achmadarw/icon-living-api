import { Router, type Router as RouterType } from 'express';
import { householdController } from '../controllers/household.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createHouseholdSchema, idParamSchema, updateHouseholdSchema } from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('KETUA', 'BENDAHARA'),
  validate(createHouseholdSchema),
  (req, res, next) => householdController.create(req, res, next),
);

router.get(
  '/:id',
  authorize('KETUA', 'BENDAHARA'),
  validate(idParamSchema, 'params'),
  (req, res, next) => householdController.findById(req, res, next),
);

router.patch(
  '/:id',
  authorize('KETUA', 'BENDAHARA'),
  validate(idParamSchema, 'params'),
  validate(updateHouseholdSchema),
  (req, res, next) => householdController.update(req, res, next),
);

export default router;
