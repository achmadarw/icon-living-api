import type { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { buildPaginationMeta } from '../utils/response';

export class PaymentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Log payment creation request
      const { logger } = await import('../utils/logger');
      logger.info('💳 CREATE PAYMENT REQUEST');
      logger.step(1, 'Payment data received', {
        paymentTypeId: req.body.paymentTypeId,
        amount: req.body.amount,
        bankName: req.body.bankName,
        transferDate: req.body.transferDate,
        proofImageUrl: req.body.proofImageUrl,
        periods: req.body.periods,
      });

      const payment = await paymentService.create(req.user!.userId, req.body);
      logger.success('✅ PAYMENT CREATED', { id: payment.id });
      sendCreated(res, payment);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { payments, total } = await paymentService.findAll(req.query as any);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const meta = buildPaginationMeta(page, limit, total);
      sendSuccess(res, payments, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async findMine(req: Request, res: Response, next: NextFunction) {
    try {
      const { payments, total } = await paymentService.findByUser(req.user!.userId, req.query as any);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const meta = buildPaginationMeta(page, limit, total);
      sendSuccess(res, payments, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.findById(req.params.id);
      sendSuccess(res, payment);
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.approve(req.params.id, req.user!.userId, req.body.note);
      sendSuccess(res, payment);
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.reject(req.params.id, req.user!.userId, req.body.note);
      sendSuccess(res, payment);
    } catch (err) {
      next(err);
    }
  }

  async getArrears(req: Request, res: Response, next: NextFunction) {
    try {
      const arrears = await paymentService.getArrears(req.query as any);
      sendSuccess(res, arrears);
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
