import type { Request, Response, NextFunction } from 'express';
import { rosterService } from '../services/roster.service';
import { rosterAutoAssignService } from '../services/roster-auto-assign.service';
import { rosterPdfService } from '../services/roster-pdf.service';
import { sendSuccess } from '../utils/response';

export class RosterController {
  /** Daftar pola yang sedang berlaku bulan itu (hasil Auto Assign). Hanya baca. */
  async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await rosterService.listAssignments(String(req.query.month ?? '')));
    } catch (err) {
      next(err);
    }
  }

  async clearMonth(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await rosterService.clearMonth(String(req.body?.month ?? '')));
    } catch (err) {
      next(err);
    }
  }

  async getSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const month = String(req.query.month ?? '');
      const personnelId =
        typeof req.query.personnelId === 'string' ? req.query.personnelId : undefined;
      sendSuccess(res, await rosterService.getMonthSchedule(month, personnelId));
    } catch (err) {
      next(err);
    }
  }

  /** Koreksi manual satu sel kalender. */
  async setDay(req: Request, res: Response, next: NextFunction) {
    try {
      const { personnelId, date, shiftId } = req.body as {
        personnelId: string;
        date: string;
        shiftId: string | null;
      };
      sendSuccess(
        res,
        await rosterService.setDayOverride(
          { personnelId, date, shiftId: shiftId ?? null },
          req.user!.userId,
        ),
      );
    } catch (err) {
      next(err);
    }
  }

  async clearDay(req: Request, res: Response, next: NextFunction) {
    try {
      const { personnelId, date } = req.body as { personnelId: string; date: string };
      sendSuccess(res, await rosterService.clearDayOverride(personnelId, date));
    } catch (err) {
      next(err);
    }
  }

  /** Susun & simpan roster satu bulan secara otomatis. */
  async autoAssign(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await rosterAutoAssignService.autoAssign(req.body, req.user!.userId));
    } catch (err) {
      next(err);
    }
  }

  async undoAutoAssign(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await rosterAutoAssignService.undo(String(req.body?.month ?? ''), req.user!.userId),
      );
    } catch (err) {
      next(err);
    }
  }

  /** Unduh roster bulan berjalan sebagai PDF. */
  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const month = String(req.query.month ?? req.body?.month ?? '');
      const { buffer, filename } = await rosterPdfService.generate(month);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (err) {
      return next(err);
    }
  }

  async undoAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const month = String(req.query.month ?? '');
      sendSuccess(res, { available: await rosterAutoAssignService.hasUndo(month) });
    } catch (err) {
      next(err);
    }
  }
}

export const rosterController = new RosterController();
