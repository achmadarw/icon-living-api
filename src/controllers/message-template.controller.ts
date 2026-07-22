import type { Request, Response, NextFunction } from 'express';
import { messageTemplateService } from '../services/message-template.service';
import { sendSuccess } from '../utils/response';
import type {
  CreateMessageTemplateInput,
  UpdateMessageTemplateInput,
} from '@tia/shared';

export class MessageTemplateController {
  /** GET /message-templates */
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await messageTemplateService.list();
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }

  /** POST /message-templates */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as CreateMessageTemplateInput;
      const created = await messageTemplateService.create(input, req.user!.userId);
      sendSuccess(res, created, 201);
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /message-templates/:id */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as UpdateMessageTemplateInput;
      const updated = await messageTemplateService.update(req.params.id, input);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /message-templates/:id */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await messageTemplateService.remove(req.params.id);
      sendSuccess(res, { id: req.params.id });
    } catch (err) {
      next(err);
    }
  }
}

export const messageTemplateController = new MessageTemplateController();
