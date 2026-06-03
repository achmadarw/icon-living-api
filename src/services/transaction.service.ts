import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { acquireLedgerLock, getLastLedgerState, rebuildLedgerTailFromOrder } from './ledger.service';
import type { PaginationQuery } from '@tia/shared';

interface TransactionQuery extends PaginationQuery {
  type?: 'INCOME' | 'EXPENSE';
  year?: number;
  month?: number;
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
  transactionCount: number;
  payerCount: number;
}

interface CreateOtherIncomeInput {
  amount: number;
  description: string;
  receivedAt?: Date;
}

export class TransactionService {
  async findAll(query: TransactionQuery) {
    const { page = 1, limit = 20, type, year, month, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};
    if (type) where.type = type;
    if (year && month) {
      where.createdAt = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else if (year) {
      where.createdAt = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          balanceBefore: true,
          balanceAfter: true,
          referenceId: true,
          referenceType: true,
          createdAt: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const paymentReferenceIds = transactions
      .filter((tx) => tx.referenceType === 'PAYMENT' && !!tx.referenceId)
      .map((tx) => tx.referenceId!) as string[];

    const payments = paymentReferenceIds.length > 0
      ? await prisma.payment.findMany({
          where: { id: { in: paymentReferenceIds } },
          select: {
            id: true,
            paymentType: { select: { isMandatory: true, name: true } },
            user: { select: { id: true, name: true, unitNumber: true } },
          },
        })
      : [];

    const paymentMap = new Map(payments.map((p) => [p.id, p]));

    const enriched = transactions.map((tx) => {
      if (tx.referenceType !== 'PAYMENT' || !tx.referenceId) return tx;
      const payment = paymentMap.get(tx.referenceId);
      if (!payment) return tx;

      const isIplPayment = payment.paymentType.isMandatory || payment.paymentType.name.toUpperCase().includes('IPL');
      if (!isIplPayment) return tx;

      return {
        ...tx,
        paymentUser: payment.user,
      };
    });

    return { transactions: enriched, total };
  }

  async getBalance() {
    let lastTx = null as Awaited<ReturnType<typeof prisma.transaction.findFirst>>;
    try {
      lastTx = await prisma.transaction.findFirst({
        orderBy: { ledgerOrder: 'desc' },
      });
    } catch {
      // Fallback saat schema DB belum sinkron (contoh: kolom ledgerOrder belum termigrasi)
      lastTx = await prisma.transaction.findFirst({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    }

    return {
      balance: lastTx ? lastTx.balanceAfter.toNumber() : 0,
      lastUpdated: lastTx?.createdAt ?? null,
    };
  }

  async getOpeningBalance(year: number) {
    const yearStart = new Date(year, 0, 1);
    const openingTx = await prisma.transaction.findFirst({
      where: {
        referenceType: 'OPENING_BALANCE',
        createdAt: { lt: yearStart },
      },
      orderBy: [{ createdAt: 'desc' }, { ledgerOrder: 'desc' }],
    });

    if (openingTx) {
      return { openingBalance: openingTx.balanceAfter.toNumber() };
    }

    let lastTx = null as Awaited<ReturnType<typeof prisma.transaction.findFirst>>;
    try {
      lastTx = await prisma.transaction.findFirst({
        where: { createdAt: { lt: yearStart } },
        orderBy: { ledgerOrder: 'desc' },
      });
    } catch {
      lastTx = await prisma.transaction.findFirst({
        where: { createdAt: { lt: yearStart } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    }
    return { openingBalance: lastTx ? lastTx.balanceAfter.toNumber() : 0 };
  }

  async getSummary(year: number, month?: number) {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 1)
      : new Date(year + 1, 0, 1);

    const [income, otherIncome, expense] = await prisma.$transaction([
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
          type: 'INCOME',
          referenceType: 'OTHER_INCOME',
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
    const totalOtherIncome = otherIncome._sum.amount?.toNumber() ?? 0;
    const totalExpense = expense._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalOtherIncome,
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
        transactionCount: 0,
        payerCount: 0,
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
            userId: true,
            amount: true,
            periods: { select: { id: true } },
          },
        },
      },
    });

    const receivedByPeriod = new Map<string, number>();
    const transactionCountByPeriod = new Map<string, number>();
    const payerSetByPeriod = new Map<string, Set<string>>();
    for (const item of paidPeriods) {
      const periodCount = item.payment.periods.length || 1;
      const amountPerPeriod = item.payment.amount.toNumber() / periodCount;
      receivedByPeriod.set(item.period, (receivedByPeriod.get(item.period) ?? 0) + amountPerPeriod);
      transactionCountByPeriod.set(item.period, (transactionCountByPeriod.get(item.period) ?? 0) + 1);
      if (!payerSetByPeriod.has(item.period)) {
        payerSetByPeriod.set(item.period, new Set<string>());
      }
      payerSetByPeriod.get(item.period)!.add(item.payment.userId);
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
        transactionCount: transactionCountByPeriod.get(period) ?? 0,
        payerCount: payerSetByPeriod.get(period)?.size ?? 0,
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

  async createOtherIncome(input: CreateOtherIncomeInput) {
    const receivedAt = input.receivedAt ?? new Date();
    return prisma.$transaction(async (tx) => {
      await acquireLedgerLock(tx);
      const ledgerState = await getLastLedgerState(tx);
      const currentBalance = ledgerState.balance;
      const afterBalance = Number((currentBalance + input.amount).toFixed(2));

      const created = await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: input.amount,
          description: input.description,
          balanceBefore: currentBalance,
          balanceAfter: afterBalance,
          referenceType: 'OTHER_INCOME',
          createdAt: receivedAt,
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          balanceBefore: true,
          balanceAfter: true,
          referenceId: true,
          referenceType: true,
          createdAt: true,
          ledgerOrder: true,
        },
      });

      if (
        ledgerState.lastCreatedAt &&
        receivedAt.getTime() < ledgerState.lastCreatedAt.getTime()
      ) {
        await rebuildLedgerTailFromOrder(tx, created.ledgerOrder);
      }

      return {
        id: created.id,
        type: created.type,
        amount: created.amount,
        description: created.description,
        balanceBefore: created.balanceBefore,
        balanceAfter: created.balanceAfter,
        referenceId: created.referenceId,
        referenceType: created.referenceType,
        createdAt: created.createdAt,
      };
    });
  }
}

export const transactionService = new TransactionService();
