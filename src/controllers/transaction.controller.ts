import type { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import { buildPaginationMeta } from '../utils/response';
import { sendCreated } from '../utils/response';

export class TransactionController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const type = req.query.type as 'INCOME' | 'EXPENSE' | undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const search = req.query.search as string | undefined;
      const sortBy = (req.query.sortBy as 'createdAt' | 'amount') || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const { transactions, total } = await transactionService.findAll({ page, limit, type, year, month, search, sortBy, sortOrder });
      const meta = buildPaginationMeta(page, limit, total);
      sendSuccess(res, transactions, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getBalance(_req: Request, res: Response, next: NextFunction) {
    try {
      const balance = await transactionService.getBalance();
      sendSuccess(res, balance);
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = req.query.month ? Number(req.query.month) : undefined;
      const summary = await transactionService.getSummary(year, month);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  }

  async getCashFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const cashFlow = await transactionService.getCashFlow(year);
      sendSuccess(res, cashFlow);
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await transactionService.getDashboard();
      sendSuccess(res, dashboard);
    } catch (err) {
      next(err);
    }
  }

  async getIplPeriodFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const flow = await transactionService.getIplPeriodFlow(year);
      sendSuccess(res, flow);
    } catch (err) {
      next(err);
    }
  }

  async createOtherIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const amount = Number(req.body.amount);
      const description = String(req.body.description ?? '').trim();
      const receivedAt = req.body.receivedAt ? new Date(req.body.receivedAt as string) : undefined;

      const created = await transactionService.createOtherIncome({
        amount,
        description,
        receivedAt,
      });
      sendCreated(res, created);
    } catch (err) {
      next(err);
    }
  }
}

export const transactionController = new TransactionController();
