import type { Request, Response, NextFunction } from 'express';
import { expenseService } from '../services/expense.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { buildPaginationMeta } from '../utils/response';

export class ExpenseController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.create(req.user!.userId, req.body);
      sendCreated(res, expense);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { expenses, total } = await expenseService.findAll(req.query as any);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const meta = buildPaginationMeta(page, limit, total);
      sendSuccess(res, expenses, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.findById(req.params.id);
      sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.approve(req.params.id, req.user!.userId, req.body.note);
      sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.reject(req.params.id, req.user!.userId, req.body.note);
      sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  }
}

export const expenseController = new ExpenseController();
