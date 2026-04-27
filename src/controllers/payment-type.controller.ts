import type { Request, Response, NextFunction } from 'express';
import { paymentTypeService } from '../services/payment-type.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

export class PaymentTypeController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const pt = await paymentTypeService.create(req.body);
      sendCreated(res, pt);
    } catch (err) {
      next(err);
    }
  }

  async findAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = await paymentTypeService.findAll();
      sendSuccess(res, list);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const pt = await paymentTypeService.findById(req.params.id);
      sendSuccess(res, pt);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const pt = await paymentTypeService.update(req.params.id, req.body);
      sendSuccess(res, pt);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentTypeService.delete(req.params.id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}

export const paymentTypeController = new PaymentTypeController();
