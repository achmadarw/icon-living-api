import type { Request, Response, NextFunction } from 'express';
import { securityPersonnelService } from '../services/security-personnel.service';
import { sendSuccess, sendCreated } from '../utils/response';

export class SecurityPersonnelController {
  // ─── Personel ─────────────────────────────────────────

  async listPersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const onlyActive = req.query.active === 'true';
      sendSuccess(res, await securityPersonnelService.listPersonnel(onlyActive));
    } catch (err) {
      next(err);
    }
  }

  async createPersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await securityPersonnelService.createPersonnel(req.body));
    } catch (err) {
      next(err);
    }
  }

  async updatePersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await securityPersonnelService.updatePersonnel(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  }

  async deletePersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await securityPersonnelService.deletePersonnel(req.params.id));
    } catch (err) {
      next(err);
    }
  }

  // ─── Shift ────────────────────────────────────────────

  async listShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const onlyActive = req.query.active === 'true';
      sendSuccess(res, await securityPersonnelService.listShifts(onlyActive));
    } catch (err) {
      next(err);
    }
  }

  async createShift(req: Request, res: Response, next: NextFunction) {
    try {
      sendCreated(res, await securityPersonnelService.createShift(req.body));
    } catch (err) {
      next(err);
    }
  }

  async updateShift(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await securityPersonnelService.updateShift(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  }

  async deleteShift(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await securityPersonnelService.deleteShift(req.params.id));
    } catch (err) {
      next(err);
    }
  }
}

export const securityPersonnelController = new SecurityPersonnelController();
