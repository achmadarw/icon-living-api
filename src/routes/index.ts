import { Router, type Router as RouterType } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import paymentTypeRoutes from './payment-type.routes';
import paymentRoutes from './payment.routes';
import expenseCategoryRoutes from './expense-category.routes';
import expenseRoutes from './expense.routes';
import transactionRoutes from './transaction.routes';
import uploadRoutes from './upload.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';

const router: RouterType = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/payment-types', paymentTypeRoutes);
router.use('/payments', paymentRoutes);
router.use('/expense-categories', expenseCategoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/transactions', transactionRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

export default router;
