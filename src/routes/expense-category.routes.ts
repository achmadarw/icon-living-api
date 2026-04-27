import { Router, type Router as RouterType } from 'express';
import { expenseCategoryController } from '../controllers/expense-category.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createExpenseCategorySchema, updateExpenseCategorySchema, idParamSchema } from '@tia/shared';

const router: RouterType = Router();

router.use(authenticate);

router.get('/', (req, res, next) => expenseCategoryController.findAll(req, res, next));
router.get('/:id', validate(idParamSchema, 'params'), (req, res, next) => expenseCategoryController.findById(req, res, next));

router.post('/', authorize('KETUA', 'BENDAHARA'), validate(createExpenseCategorySchema), (req, res, next) => expenseCategoryController.create(req, res, next));
router.patch('/:id', authorize('KETUA', 'BENDAHARA'), validate(idParamSchema, 'params'), validate(updateExpenseCategorySchema), (req, res, next) => expenseCategoryController.update(req, res, next));
router.delete('/:id', authorize('KETUA'), validate(idParamSchema, 'params'), (req, res, next) => expenseCategoryController.delete(req, res, next));

export default router;
