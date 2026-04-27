import type { Request, Response, NextFunction } from 'express';
import { expenseCategoryService } from '../services/expense-category.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export class ExpenseCategoryController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await expenseCategoryService.create(req.body);
      sendCreated(res, cat);
    } catch (err) {
      next(err);
    }
  }

  async findAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = await expenseCategoryService.findAll();
      sendSuccess(res, list);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await expenseCategoryService.findById(req.params.id);
      sendSuccess(res, cat);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await expenseCategoryService.update(req.params.id, req.body);
      sendSuccess(res, cat);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await expenseCategoryService.delete(req.params.id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}

export const expenseCategoryController = new ExpenseCategoryController();
