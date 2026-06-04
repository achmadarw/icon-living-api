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
  transferAmount: number;
}

export interface IplMonthlyReport {
  month: number;
  year: number;
  period: string;
  paymentTypeName: string;
  fixedAmount: number | null;
  residents: IplResidentStatus[];
  summary: { total: number; lunas: number; pending: number; belumBayar: number; totalNominalMasuk: number; totalNominalPending: number };
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
  sourceType: 'IPL' | 'OTHER_INCOME';
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
  expenseDate: Date | null;
  requesterName: string;
  categoryName: string;
  description: string;
  paymentMethod: string | null;
  recipient: string | null;
  referenceNumber: string | null;
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
      return {
        month, year, period, paymentTypeName: 'IPL', fixedAmount: null, residents: [],
        summary: { total: 0, lunas: 0, pending: 0, belumBayar: 0, totalNominalMasuk: 0, totalNominalPending: 0 },
      };
    }

    const [users, paymentPeriods] = await prisma.$transaction([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, unitNumber: true },
        orderBy: { unitNumber: 'asc' },
      }),
      prisma.paymentPeriod.findMany({
        where: { period, payment: { paymentTypeId: iplType.id } },
        select: {
          period: true,
          payment: {
            select: {
              id: true,
              userId: true,
              status: true,
              amount: true,
              periods: { select: { id: true } },
            },
          },
        },
      }),
    ]);

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const statusMap = new Map<string, { status: 'LUNAS' | 'PENDING'; paymentId: string; transferAmount: number }>();
    let totalNominalMasuk = 0;
    let totalNominalPending = 0;

    for (const pp of paymentPeriods) {
      const uid = pp.payment.userId;
      const cur = statusMap.get(uid);
      const periodsCount = pp.payment.periods.length || 1;
      const amountPerPeriod = round2(pp.payment.amount.toNumber() / periodsCount);

      if (pp.payment.status === 'APPROVED') {
        statusMap.set(uid, { status: 'LUNAS', paymentId: pp.payment.id, transferAmount: amountPerPeriod });
        totalNominalMasuk += amountPerPeriod;
      } else if (pp.payment.status === 'PENDING' && cur?.status !== 'LUNAS') {
        statusMap.set(uid, { status: 'PENDING', paymentId: pp.payment.id, transferAmount: amountPerPeriod });
        totalNominalPending += amountPerPeriod;
      }
    }

    const residents: IplResidentStatus[] = users.map((u) => {
      const e = statusMap.get(u.id);
      return {
        userId: u.id,
        name: u.name,
        unitNumber: u.unitNumber,
        status: e?.status ?? 'BELUM',
        paymentId: e?.paymentId,
        transferAmount: e?.transferAmount ?? 0,
      };
    });

    const lunas = residents.filter((r) => r.status === 'LUNAS').length;
    const pending = residents.filter((r) => r.status === 'PENDING').length;

    return {
      month, year, period, paymentTypeName: iplType.name,
      fixedAmount: iplType.fixedAmount ? iplType.fixedAmount.toNumber() : null,
      residents,
      summary: {
        total: residents.length,
        lunas,
        pending,
        belumBayar: residents.length - lunas - pending,
        totalNominalMasuk: round2(totalNominalMasuk),
        totalNominalPending: round2(totalNominalPending),
      },
    };
  }

  /** Income report aligned with overview: IPL by billing period, non-IPL by cash transaction date. */
  async getIncomeReport(query: IncomeReportQuery): Promise<IncomeReportData> {
    const { year, month, paymentTypeId } = query;
    const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
    const selectedPeriods = month
      ? [`${year}-${String(month).padStart(2, '0')}`]
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    const paymentWhere: Prisma.PaymentWhereInput = {
      status: 'APPROVED',
      ...(paymentTypeId
        ? { paymentTypeId }
        : {
            paymentType: {
              isActive: true,
              OR: [
                { isMandatory: true },
                { name: { contains: 'IPL', mode: 'insensitive' } },
              ],
            },
          }),
    };

    const [paymentPeriods, otherIncomeTransactions] = await prisma.$transaction([
      prisma.paymentPeriod.findMany({
        where: {
          period: { in: selectedPeriods },
          payment: paymentWhere,
        },
        select: {
          period: true,
          payment: {
            select: {
              id: true,
              reviewedAt: true,
              createdAt: true,
              amount: true,
              status: true,
              user: { select: { name: true, unitNumber: true } },
              paymentType: { select: { name: true } },
              periods: { select: { period: true } },
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          type: 'INCOME',
          referenceType: 'OTHER_INCOME',
          createdAt: { gte: startDate, lt: endDate },
        },
        select: {
          id: true,
          createdAt: true,
          amount: true,
          description: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const iplItems: IncomeReportItem[] = paymentPeriods.map((pp) => {
      const periodsCount = pp.payment.periods.length || 1;
      return {
        id: `${pp.payment.id}:${pp.period}`,
        date: pp.payment.reviewedAt ?? pp.payment.createdAt,
        userName: pp.payment.user.name,
        unitNumber: pp.payment.user.unitNumber,
        paymentTypeName: pp.payment.paymentType.name,
        periods: [pp.period],
        amount: round2(pp.payment.amount.toNumber() / periodsCount),
        status: pp.payment.status,
        sourceType: 'IPL',
      };
    });

    const otherIncomeItems: IncomeReportItem[] = paymentTypeId ? [] : otherIncomeTransactions.map((tx) => ({
      id: tx.id,
      date: tx.createdAt,
      userName: tx.description,
      unitNumber: null,
      paymentTypeName: 'Donatur',
      periods: [],
      amount: tx.amount.toNumber(),
      status: 'APPROVED',
      sourceType: 'OTHER_INCOME',
    }));

    const items: IncomeReportItem[] = [...iplItems, ...otherIncomeItems].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    let paymentTypeFilter: string | undefined;
    if (paymentTypeId) {
      const pt = await prisma.paymentType.findUnique({
        where: { id: paymentTypeId },
        select: { name: true },
      });
      paymentTypeFilter = pt?.name;
    }

    const totalAmount = round2(items.reduce((sum, i) => sum + i.amount, 0));

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
      OR: [
        { expenseDate: { gte: startDate, lt: endDate } },
        {
          AND: [
            { expenseDate: null },
            { approvedAt: { gte: startDate, lt: endDate } },
          ],
        },
      ],
    };
    if (categoryId) where.categoryId = categoryId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        requestedBy: { select: { name: true } },
        category: { select: { name: true, requiresApproval: true } },
      },
      orderBy: [{ expenseDate: 'asc' }, { approvedAt: 'asc' }],
    });

    let categoryFilter: string | undefined;
    if (categoryId) {
      const cat = await prisma.expenseCategory.findUnique({ where: { id: categoryId }, select: { name: true } });
      categoryFilter = cat?.name;
    }

    const items: ExpenseReportItem[] = expenses.map((e) => ({
      id: e.id, date: e.expenseDate ?? e.approvedAt ?? e.createdAt,
      expenseDate: e.expenseDate,
      requesterName: e.requestedBy.name, categoryName: e.category.name,
      description: e.description, amount: e.amount.toNumber(),
      paymentMethod: e.paymentMethod,
      recipient: e.recipient,
      referenceNumber: e.referenceNumber,
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
