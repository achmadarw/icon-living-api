import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';
import { config } from '../config';
import { sendSuccess } from '../utils/response';

const router: RouterType = Router();

router.get('/app-version', (_req: Request, res: Response) => {
  sendSuccess(res, {
    android: config.mobile.android,
  });
});

export default router;
