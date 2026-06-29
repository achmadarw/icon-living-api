import type { Request, Response, NextFunction } from 'express';
import { expenseService } from '../services/expense.service';
import { uploadService } from '../services/upload.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { buildPaginationMeta } from '../utils/response';
import { AppError } from '../utils/errors';

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
      const { expenses, total } = await expenseService.findAll(
        { userId: req.user!.userId, role: req.user!.role },
        req.query as any,
      );

      // If requester is not KETUA and asked for submitted expenses, return empty.
      const status = (req.query.status as string) || undefined;
      if (status === 'SUBMITTED' && req.user!.role !== 'KETUA') {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const meta = buildPaginationMeta(page, limit, 0);
        return sendSuccess(res, [], 200, meta);
      }

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

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.update(req.params.id, req.body);
      sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  }

  async updateAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, 'VALIDATION_ERROR', 'File image wajib diupload pada field "file"');
      }

      const attachmentUrl = await uploadService.saveFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
      );
      const expense = await expenseService.updateAttachment(req.params.id, attachmentUrl);
      sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await expenseService.delete(req.params.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const expenseController = new ExpenseController();
