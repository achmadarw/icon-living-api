import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { buildPaginationMeta } from '../utils/response';
import { PAGINATION } from '@tia/shared';
import { logger } from '../utils/logger';
import { ForbiddenError } from '../utils/errors';
import { residentExportService, ALL_SCOPES, type ExportScope } from '../services/resident-export.service';

export class UserController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role === 'BENDAHARA' && req.body.role !== 'WARGA') {
        throw new ForbiddenError('Bendahara hanya dapat membuat akun warga');
      }

      const user = await userService.create(req.body);
      sendCreated(res, user);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
      const limit = Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT;
      const { users, total } = await userService.findAll(page, limit);
      const meta = buildPaginationMeta(page, limit, total);
      sendSuccess(res, users, 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async findMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role === 'BENDAHARA') {
        const target = await userService.findById(req.params.id);
        if (target.role !== 'WARGA' || (req.body.role && req.body.role !== 'WARGA')) {
          throw new ForbiddenError('Bendahara hanya dapat mengubah data warga');
        }
      }

      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.changePassword(req.user!.userId, req.body);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }

  /** GET /users/export?format=xlsx|pdf&scope=household,members,... — unduh data warga. */
  async exportResidents(req: Request, res: Response, next: NextFunction) {
    try {
      const format = (req.query.format as string) === 'pdf' ? 'pdf' : 'xlsx';
      const scopeRaw = typeof req.query.scope === 'string' ? req.query.scope : '';
      const requested = scopeRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ExportScope => (ALL_SCOPES as string[]).includes(s));
      const scopes = requested.length > 0 ? requested : ALL_SCOPES;

      const sections = await residentExportService.buildSections(scopes);
      const stamp = new Date().toISOString().slice(0, 10);

      if (format === 'pdf') {
        const buffer = await residentExportService.buildPdf(sections);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="data-warga-${stamp}.pdf"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }

      const buffer = residentExportService.buildXlsx(sections);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="data-warga-${stamp}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (err) {
      return next(err);
    }
  }

  async findMyHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      const household = await userService.getMyHousehold(req.user!.userId);
      sendSuccess(res, household);
    } catch (err) {
      next(err);
    }
  }

  async updateMyHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      const household = await userService.updateMyHousehold(req.user!.userId, req.body);
      sendSuccess(res, household);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('🔑 RESET PASSWORD REQUEST');
      logger.step(1, 'Extracting data', {
      userId: req.params.id,
      newPasswordLength: req.body.newPassword?.length || 0,
    });
    
    logger.step(2, 'Calling userService.resetPassword');
      await userService.resetPassword(req.params.id, req.body);
      sendNoContent(res);
    } catch (err) {
      logger.error('❌ PASSWORD RESET FAILED', err);
      next(err);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.toggleActive(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
