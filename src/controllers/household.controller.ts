import type { Request, Response, NextFunction } from 'express';
import { householdService } from '../services/household.service';
import { sendCreated, sendSuccess } from '../utils/response';

export class HouseholdController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const household = await householdService.create(req.body);
      sendCreated(res, household);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const household = await householdService.findById(req.params.id);
      sendSuccess(res, household);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const household = await householdService.update(req.params.id, req.body);
      sendSuccess(res, household);
    } catch (err) {
      next(err);
    }
  }
}

export const householdController = new HouseholdController();
