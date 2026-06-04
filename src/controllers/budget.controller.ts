import type { Request, Response, NextFunction } from 'express';
import { budgetService } from '../services/budget.service';
import { sendSuccess } from '../utils/response';
import type { CreateBudgetInput, UpdateBudgetInput } from '@tia/shared';

export class BudgetController {
  /** GET /v1/budgets?year=&categoryId= */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const items = await budgetService.list(year, categoryId);
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }

  /** POST /v1/budgets */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as CreateBudgetInput;
      const created = await budgetService.create(input);
      sendSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /v1/budgets/:id */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const input = req.body as UpdateBudgetInput;
      const updated = await budgetService.update(id, input);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /v1/budgets/:id */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await budgetService.remove(req.params.id);
      sendSuccess(res, { id: req.params.id });
    } catch (err) {
      next(err);
    }
  }

  /** GET /v1/reports/budget-vs-actual?year=&month= */
  async budgetVsActual(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = req.query.month ? Number(req.query.month) : undefined;
      const report = await budgetService.budgetVsActual(year, month);
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }
}

export const budgetController = new BudgetController();
