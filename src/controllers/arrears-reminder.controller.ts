import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { arrearsReminderService } from '../services/arrears-reminder.service';
import { sendSuccess } from '../utils/response';

export class ArrearsReminderController {
  /** GET /arrears-reminders/preview — pratinjau status tunggakan (tanpa kirim). */
  async preview(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await arrearsReminderService.previewCheck();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /arrears-reminders/run — pemicu manual oleh pengurus. */
  async run(req: Request, res: Response, next: NextFunction) {
    try {
      const force = req.body?.force === true;
      const resend = req.body?.resend === true;
      const result = await arrearsReminderService.runCheck({ force, resend, triggeredBy: 'manual' });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /** GET /arrears-reminders/suspensions — daftar unit yang layanannya sedang dihentikan. */
  async listActiveSuspensions(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.wasteSuspension.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }

  /** POST /arrears-reminders/suspensions/:id/lift — cabut suspensi manual. */
  async liftSuspension(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await arrearsReminderService.liftSuspension(req.params.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /** GET /arrears-reminders/history — rekap jumlah peringatan/penghentian per bulan. */
  async history(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await arrearsReminderService.getRunHistory();
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }

  /** GET /arrears-reminders/effective-templates — teks penagihan yang berlaku (preview). */
  async effectiveTemplates(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await arrearsReminderService.getEffectiveTemplates();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /arrears-reminders/templates/:kind/edit — pastikan template slot ada, kembalikan untuk diedit. */
  async ensureEditableTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const kind = req.params.kind === 'suspension' ? 'suspension' : 'warning';
      const result = await arrearsReminderService.ensureEditableTemplate(kind, req.user!.userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /arrears-reminders/templates/ensure — pastikan kedua template penagihan ada. */
  async ensureAllTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await arrearsReminderService.ensureAllTemplates(req.user!.userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /** GET /arrears-reminders/settings */
  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await arrearsReminderService.getPublicSettings();
      sendSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /arrears-reminders/settings */
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { enabled, warningTemplateId, suspensionTemplateId } = req.body ?? {};
      const settings = await arrearsReminderService.updateSettings({
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
        ...(warningTemplateId !== undefined ? { warningTemplateId: warningTemplateId || null } : {}),
        ...(suspensionTemplateId !== undefined ? { suspensionTemplateId: suspensionTemplateId || null } : {}),
      });
      sendSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  }

  /** POST /internal/arrears-check — dipicu cron eksternal (secret header). */
  async cronRun(req: Request, res: Response, next: NextFunction) {
    try {
      const secret = process.env.CRON_SECRET;
      const provided = req.header('x-cron-secret');
      if (!secret || provided !== secret) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Secret tidak valid' } });
      }
      const result = await arrearsReminderService.runCheck({ triggeredBy: 'cron' });
      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  }
}

export const arrearsReminderController = new ArrearsReminderController();
