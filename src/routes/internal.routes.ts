import { Router, type Router as RouterType } from 'express';
import { arrearsReminderController } from '../controllers/arrears-reminder.controller';
import { whatsappDeliveryController } from '../controllers/whatsapp-delivery.controller';

// Rute internal untuk dipicu cron/webhook eksternal. Tidak memakai auth JWT;
// dilindungi secret (dicek di controller masing-masing).
const router: RouterType = Router();

router.post('/arrears-check', (req, res, next) => arrearsReminderController.cronRun(req, res, next));

// Webhook "Update Message Status" dari Fonnte.
router.post('/fonnte/status', (req, res) => whatsappDeliveryController.fonnteStatus(req, res));

export default router;
