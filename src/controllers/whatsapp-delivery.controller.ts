import type { Request, Response, NextFunction } from 'express';
import { whatsappDeliveryService } from '../services/whatsapp-delivery.service';
import { sendSuccess } from '../utils/response';

export class WhatsappDeliveryController {
  /** GET /whatsapp-deliveries?batchId=...  (KETUA/BENDAHARA) — daftar + ringkasan status. */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = typeof req.query.batchId === 'string' ? req.query.batchId : undefined;
      const source = typeof req.query.source === 'string' ? req.query.source : undefined;

      if (batchId) {
        const [items, summary] = await Promise.all([
          whatsappDeliveryService.listByBatch(batchId),
          whatsappDeliveryService.summaryByBatch(batchId),
        ]);
        return sendSuccess(res, { batchId, summary, items });
      }

      const items = await whatsappDeliveryService.listRecent(source, 100);
      return sendSuccess(res, { items });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /internal/fonnte/status — webhook "Update Message Status" dari Fonnte.
   * Diamankan lewat query `?token=` yang dicocokkan dengan FONNTE_WEBHOOK_SECRET
   * (fallback CRON_SECRET). Selalu balas 200 agar Fonnte tidak retry berlebihan.
   */
  async fonnteStatus(req: Request, res: Response) {
    try {
      const secret = process.env.FONNTE_WEBHOOK_SECRET || process.env.CRON_SECRET;
      const provided =
        (typeof req.query.token === 'string' ? req.query.token : undefined) ??
        req.header('x-webhook-secret') ??
        undefined;
      if (secret && provided !== secret) {
        return res.status(401).json({ success: false });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      await whatsappDeliveryService.updateFromWebhook({
        device: body.device !== undefined ? String(body.device) : undefined,
        id: body.id !== undefined ? String(body.id) : undefined,
        stateid: body.stateid !== undefined ? String(body.stateid) : undefined,
        status: body.status !== undefined ? String(body.status) : undefined,
        state: body.state !== undefined ? String(body.state) : undefined,
      });

      // Fonnte hanya butuh 200; retry 15x/menit bila non-200.
      return res.status(200).json({ success: true });
    } catch {
      // Tetap balas 200 supaya webhook tidak diretry terus; error sudah tertelan di service.
      return res.status(200).json({ success: true });
    }
  }
}

export const whatsappDeliveryController = new WhatsappDeliveryController();
