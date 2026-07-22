import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { arrearsReminderController } from '../controllers/arrears-reminder.controller';

const router: RouterType = Router();

router.use(authenticate);
router.use(authorize('KETUA', 'BENDAHARA'));

router.get('/preview', (req, res, next) => arrearsReminderController.preview(req, res, next));
router.post('/run', (req, res, next) => arrearsReminderController.run(req, res, next));
router.get('/suspensions', (req, res, next) => arrearsReminderController.listActiveSuspensions(req, res, next));
router.post('/suspensions/:id/lift', (req, res, next) => arrearsReminderController.liftSuspension(req, res, next));
router.get('/history', (req, res, next) => arrearsReminderController.history(req, res, next));
router.get('/effective-templates', (req, res, next) => arrearsReminderController.effectiveTemplates(req, res, next));
router.post('/templates/ensure', (req, res, next) => arrearsReminderController.ensureAllTemplates(req, res, next));
router.post('/templates/:kind/edit', (req, res, next) => arrearsReminderController.ensureEditableTemplate(req, res, next));
router.get('/settings', (req, res, next) => arrearsReminderController.getSettings(req, res, next));
router.patch('/settings', (req, res, next) => arrearsReminderController.updateSettings(req, res, next));

export default router;
