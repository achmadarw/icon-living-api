import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { PaginationQuery } from '@tia/shared';

interface TransactionQuery extends PaginationQuery {
  type?: 'INCOME' | 'EXPENSE';
  search?: string;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
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
