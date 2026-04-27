import type { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { exportService } from '../services/export.service';
import { sendSuccess } from '../utils/response';

export class ReportController {
  /** GET /v1/reports/ipl-monthly — JSON IPL status */
  async getIplMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const report = await reportService.getIplMonthlyReport({ month, year });
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  /** GET /v1/reports/ipl-monthly/export — PDF/CSV download */
  async exportIplMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const format = (req.query.format as string) || 'pdf';

      const report = await reportService.getIplMonthlyReport({ month, year });
      const strategy = exportService.getIplStrategy(format);
      const buffer = await strategy.generate(report);

      const filename = `laporan-ipl-${report.period}.${strategy.fileExtension}`;
      res.setHeader('Content-Type', strategy.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  /** GET /v1/reports/income — JSON income data */
  async getIncomeReport(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = req.query.month ? Number(req.query.month) : undefined;
      const paymentTypeId = req.query.paymentTypeId as string | undefined;
      const report = await reportService.getIncomeReport({ year, month, paymentTypeId });
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  /** GET /v1/reports/income/export — PDF/CSV download */
  async exportIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = req.query.month ? Number(req.query.month) : undefined;
      const paymentTypeId = req.query.paymentTypeId as string | undefined;
      const format = (req.query.format as string) || 'pdf';

      const report = await reportService.getIncomeReport({ year, month, paymentTypeId });
      const strategy = exportService.getIncomeStrategy(format);
      const buffer = await strategy.generate(report);

      const filename = `laporan-pemasukan-${report.period}.${strategy.fileExtension}`;
      res.setHeader('Content-Type', strategy.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  /** GET /v1/reports/expenses — JSON expense data */
  async getExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = req.query.month ? Number(req.query.month) : undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const report = await reportService.getExpenseReport({ year, month, categoryId });
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  /** GET /v1/reports/expenses/export — PDF/CSV download */
  async exportExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year);
      const month = req.query.month ? Number(req.query.month) : undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const format = (req.query.format as string) || 'pdf';

      const report = await reportService.getExpenseReport({ year, month, categoryId });
      const strategy = exportService.getExpenseStrategy(format);
      const buffer = await strategy.generate(report);

      const filename = `laporan-pengeluaran-${report.period}.${strategy.fileExtension}`;
      res.setHeader('Content-Type', strategy.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
