import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { IplMonthlyQuery, IncomeReportQuery, ExpenseReportQuery } from '@tia/shared';

// ─── Response Types ─────────────────────────────────────

export interface IplResidentStatus {
  userId: string;
  name: string;
  unitNumber: string | null;
  status: 'LUNAS' | 'PENDING' | 'BELUM';
  paymentId?: string;
}

export interface IplMonthlyReport {
  month: number;
  year: number;
  period: string;
  paymentTypeName: string;
  fixedAmount: number | null;
  residents: IplResidentStatus[];
  summary: { total: number; lunas: number; pending: number; belumBayar: number };
}

export interface IncomeReportItem {
  id: string;
  date: Date;
  userName: string;
  unitNumber: string | null;
  paymentTypeName: string;
  periods: string[];
  amount: number;
  status: string;
}

export interface IncomeReportData {
  year: number;
  month?: number;
  period: string;
  paymentTypeFilter?: string;
  items: IncomeReportItem[];
  summary: { totalAmount: number; totalTransactions: number };
}

export interface ExpenseReportItem {
  id: string;
  date: Date;
  requesterName: string;
  categoryName: string;
  description: string;
  amount: number;
  status: string;
  isAutoApproved: boolean;
}

export interface ExpenseReportData {
  year: number;
  month?: number;
  period: string;
  categoryFilter?: string;
  items: ExpenseReportItem[];
  summary: { totalAmount: number; totalExpenses: number; autoApprovedCount: number; manualApprovedCount: number };
}

// ─── Service ────────────────────────────────────────────

export class ReportService {
  /** IPL monthly report: payment status per resident for a given month. */
  async getIplMonthlyReport(query: IplMonthlyQuery): Promise<IplMonthlyReport> {
    const { month, year } = query;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const iplType = await prisma.paymentType.findFirst({
      where: { isMandatory: true, isActive: true },
    });

    if (!iplType) {
      return { month, year, period, paymentTypeName: 'IPL', fixedAmount: null, residents: [], summary: { total: 0, lunas: 0, pending: 0, belumBayar: 0 } };
    }

    const [users, paymentPeriods] = await prisma.$transaction([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, unitNumber: true },
        orderBy: { unitNumber: 'asc' },
      }),
      prisma.paymentPeriod.findMany({
        where: { period, payment: { paymentTypeId: iplType.id } },
        select: { period: true, payment: { select: { id: true, userId: true, status: true } } },
      }),
    ]);

    const statusMap = new Map<string, { status: 'LUNAS' | 'PENDING'; paymentId: string }>();
    for (const pp of paymentPeriods) {
      const uid = pp.payment.userId;
      const cur = statusMap.get(uid);
      if (pp.payment.status === 'APPROVED') {
        statusMap.set(uid, { status: 'LUNAS', paymentId: pp.payment.id });
      } else if (pp.payment.status === 'PENDING' && cur?.status !== 'LUNAS') {
        statusMap.set(uid, { status: 'PENDING', paymentId: pp.payment.id });
      }
    }

    const residents: IplResidentStatus[] = users.map((u) => {
      const e = statusMap.get(u.id);
      return { userId: u.id, name: u.name, unitNumber: u.unitNumber, status: e?.status ?? 'BELUM', paymentId: e?.paymentId };
    });

    const lunas = residents.filter((r) => r.status === 'LUNAS').length;
    const pending = residents.filter((r) => r.status === 'PENDING').length;

    return {
      month, year, period, paymentTypeName: iplType.name,
      fixedAmount: iplType.fixedAmount ? iplType.fixedAmount.toNumber() : null,
      residents,
      summary: { total: residents.length, lunas, pending, belumBayar: residents.length - lunas - pending },
    };
  }

  /** Income report from approved payments. */
  async getIncomeReport(query: IncomeReportQuery): Promise<IncomeReportData> {
    const { year, month, paymentTypeId } = query;
    const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

    const where: Prisma.PaymentWhereInput = {
      status: 'APPROVED',
      reviewedAt: { gte: startDate, lt: endDate },
    };
    if (paymentTypeId) where.paymentTypeId = paymentTypeId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, unitNumber: true } },
        paymentType: { select: { name: true } },
        periods: { select: { period: true } },
      },
      orderBy: { reviewedAt: 'asc' },
    });

    let paymentTypeFilter: string | undefined;
    if (paymentTypeId) {
      const pt = await prisma.paymentType.findUnique({ where: { id: paymentTypeId }, select: { name: true } });
      paymentTypeFilter = pt?.name;
    }

    const items: IncomeReportItem[] = payments.map((p) => ({
      id: p.id, date: p.reviewedAt ?? p.createdAt,
      userName: p.user.name, unitNumber: p.user.unitNumber,
      paymentTypeName: p.paymentType.name,
      periods: p.periods.map((pp) => pp.period).sort(),
      amount: p.amount.toNumber(), status: p.status,
    }));

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    return {
      year, month,
      period: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`,
      paymentTypeFilter, items,
      summary: { totalAmount, totalTransactions: items.length },
    };
  }

  /** Expense report from approved expenses. */
  async getExpenseReport(query: ExpenseReportQuery): Promise<ExpenseReportData> {
    const { year, month, categoryId } = query;
    const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

    const where: Prisma.ExpenseWhereInput = {
      status: 'APPROVED',
      approvedAt: { gte: startDate, lt: endDate },
    };
    if (categoryId) where.categoryId = categoryId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        requestedBy: { select: { name: true } },
        category: { select: { name: true, requiresApproval: true } },
      },
      orderBy: { approvedAt: 'asc' },
    });

    let categoryFilter: string | undefined;
    if (categoryId) {
      const cat = await prisma.expenseCategory.findUnique({ where: { id: categoryId }, select: { name: true } });
      categoryFilter = cat?.name;
    }

    const items: ExpenseReportItem[] = expenses.map((e) => ({
      id: e.id, date: e.approvedAt ?? e.createdAt,
      requesterName: e.requestedBy.name, categoryName: e.category.name,
      description: e.description, amount: e.amount.toNumber(),
      status: e.status, isAutoApproved: !e.category.requiresApproval,
    }));

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    const autoApprovedCount = items.filter((i) => i.isAutoApproved).length;

    return {
      year, month,
      period: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`,
      categoryFilter, items,
      summary: { totalAmount, totalExpenses: items.length, autoApprovedCount, manualApprovedCount: items.length - autoApprovedCount },
    };
  }
}

export const reportService = new ReportService();
