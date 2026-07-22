import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { whatsappDeliveryController } from '../controllers/whatsapp-delivery.controller';

const router: RouterType = Router();

router.use(authenticate);
router.use(authorize('KETUA', 'BENDAHARA'));

router.get('/', (req, res, next) => whatsappDeliveryController.list(req, res, next));

export default router;
