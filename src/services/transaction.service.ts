import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { PaginationQuery } from '@tia/shared';

interface TransactionQuery extends PaginationQuery {
  type?: 'INCOME' | 'EXPENSE';
  search?: string;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

interface IplPeriodFlowItem {
  month: string;
  period: string;
  targetAmount: number;
  receivedAmount: number;
  coverageRate: number;
}

export class TransactionService {
  async findAll(query: TransactionQuery) {
    const { page = 1, limit = 20, type, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};
    if (type) where.type = type;
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async getBalance() {
    const lastTx = await prisma.transaction.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return {
      balance: lastTx ? lastTx.balanceAfter.toNumber() : 0,
      lastUpdated: lastTx?.createdAt ?? null,
    };
  }

  async getSummary(year: number, month?: number) {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 1)
      : new Date(year + 1, 0, 1);

    const [income, expense] = await prisma.$transaction([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'INCOME',
          createdAt: { gte: startDate, lt: endDate },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'EXPENSE',
          createdAt: { gte: startDate, lt: endDate },
        },
      }),
    ]);

    const totalIncome = income._sum.amount?.toNumber() ?? 0;
    const totalExpense = expense._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      period: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`,
    };
  }

  async getCashFlow(year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const cashFlow = await Promise.all(
      months.map(async (month) => {
        const summary = await this.getSummary(year, month);
        return {
          month: `${year}-${String(month).padStart(2, '0')}`,
          ...summary,
        };
      })
    );

    return cashFlow;
  }

  async getIplPeriodFlow(year: number): Promise<IplPeriodFlowItem[]> {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const periods = months.map((month) => `${year}-${String(month).padStart(2, '0')}`);

    const [iplType, totalActiveUsers] = await prisma.$transaction([
      prisma.paymentType.findFirst({
        where: {
          isActive: true,
          OR: [
            { isMandatory: true },
            { name: { contains: 'IPL', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    if (!iplType) {
      return periods.map((period) => ({
        month: period,
        period,
        targetAmount: 0,
        receivedAmount: 0,
        coverageRate: 0,
      }));
    }

    const fixedAmount = iplType.fixedAmount?.toNumber() ?? 0;
    const targetAmount = fixedAmount * totalActiveUsers;

    const paidPeriods = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: periods },
        payment: {
          status: 'APPROVED',
          paymentTypeId: iplType.id,
        },
      },
      select: {
        period: true,
        payment: {
          select: {
            amount: true,
            periods: { select: { id: true } },
          },
        },
      },
    });

    const receivedByPeriod = new Map<string, number>();
    for (const item of paidPeriods) {
      const periodCount = item.payment.periods.length || 1;
      const amountPerPeriod = item.payment.amount.toNumber() / periodCount;
      receivedByPeriod.set(item.period, (receivedByPeriod.get(item.period) ?? 0) + amountPerPeriod);
    }

    return periods.map((period) => {
      const receivedAmount = Math.round((receivedByPeriod.get(period) ?? 0) * 100) / 100;
      const coverageRate = targetAmount > 0 ? Math.round((receivedAmount / targetAmount) * 10000) / 100 : 0;
      return {
        month: period,
        period,
        targetAmount,
        receivedAmount,
        coverageRate,
      };
    });
  }

  async getDashboard() {
    const balance = await this.getBalance();

    const now = new Date();
    const monthlySummary = await this.getSummary(now.getFullYear(), now.getMonth() + 1);

    const [pendingPayments, pendingExpenses, totalUsers] = await prisma.$transaction([
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.expense.count({ where: { status: 'SUBMITTED' } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      balance: balance.balance,
      monthlySummary,
      pendingPayments,
      pendingExpenses,
      totalUsers,
    };
  }
}

export const transactionService = new TransactionService();
