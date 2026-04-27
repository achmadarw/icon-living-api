import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';

const router: RouterType = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Server is healthy
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
