import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError, InvalidStatusError, InsufficientBalanceError } from '../utils/errors';
import { notificationService } from './notification.service';
import { acquireLedgerLock, getLastLedgerState, rebuildLedgerTailFromOrder } from './ledger.service';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseQuery } from '@tia/shared';

export class ExpenseService {
  async create(requestedById: string, input: CreateExpenseInput) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category || !category.isActive) {
      throw new NotFoundError('Kategori pengeluaran');
    }

    // Auto-approve if category doesn't require approval
    if (!category.requiresApproval) {
      const autoExpense = await this.createAutoApproved(requestedById, input, category.name);
      // Notify Ketua about auto-approved expense - fire and forget
      notificationService.onExpenseAutoApproved({
        id: autoExpense.id,
        description: input.description,
        amount: input.amount,
        requestedByName: autoExpense.requestedBy.name,
      }).catch(() => {});
      return autoExpense;
    }

    const expense = await prisma.expense.create({
      data: {
        amount: input.amount,
        description: input.description,
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
        paymentMethod: input.paymentMethod,
        recipient: input.recipient,
        referenceNumber: input.referenceNumber,
        attachmentUrl: input.attachmentUrl,
        categoryId: input.categoryId,
        requestedById,
        status: 'SUBMITTED',
      },
      include: {
        category: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    // Notify Ketua about submitted expense - fire and forget
    notificationService.onExpenseSubmitted({
      id: expense.id,
      description: input.description,
      amount: input.amount,
      requestedByName: expense.requestedBy.name,
    }).catch(() => {});

    return expense;
  }

  private async createAutoApproved(requestedById: string, input: CreateExpenseInput, categoryName: string) {
    return prisma.$transaction(async (tx) => {
      await acquireLedgerLock(tx);
      const ledgerState = await getLastLedgerState(tx);
      const currentBalance = ledgerState.balance;

      if (currentBalance < input.amount) {
        throw new InsufficientBalanceError();
      }

      const businessDate = input.expenseDate ? new Date(input.expenseDate) : new Date();

      const transaction = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: input.amount,
          description: `Pengeluaran ${categoryName}: ${input.description}`,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - input.amount,
          referenceType: 'EXPENSE',
          createdAt: businessDate,
        },
        select: { id: true, ledgerOrder: true },
      });

      const expense = await tx.expense.create({
        data: {
          amount: input.amount,
          description: input.description,
          expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
          paymentMethod: input.paymentMethod,
          recipient: input.recipient,
          referenceNumber: input.referenceNumber,
          attachmentUrl: input.attachmentUrl,
          categoryId: input.categoryId,
          requestedById,
          status: 'APPROVED',
          approvedAt: businessDate,
          transactionId: transaction.id,
        },
        include: {
          category: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      });

      // Update transaction referenceId
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: expense.id },
      });

      if (
        ledgerState.lastCreatedAt &&
        businessDate.getTime() < ledgerState.lastCreatedAt.getTime()
      ) {
        await rebuildLedgerTailFromOrder(tx, transaction.ledgerOrder);
      }

      return expense;
    });
  }

  async findAll(requester: { userId: string; role: string }, query: ExpenseQuery) {
    const { page = 1, limit = 20, status, categoryId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    // If the query requests submitted expenses, only KETUA may see them.
    if (status === 'SUBMITTED' && requester?.role !== 'KETUA') {
      return { expenses: [], total: 0 };
    }

    const [expenses, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total };
  }

  async findById(id: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        transaction: true,
      },
    });

    if (!expense) {
      throw new NotFoundError('Pengeluaran');
    }

    return expense;
  }

  async approve(id: string, approverId: string, note?: string) {
    const expense = await this.findById(id);

    if (expense.status !== 'SUBMITTED') {
      throw new InvalidStatusError(expense.status, 'SUBMITTED');
    }

    const result = await prisma.$transaction(async (tx) => {
      await acquireLedgerLock(tx);
      const ledgerState = await getLastLedgerState(tx);
      const currentBalance = ledgerState.balance;

      if (currentBalance < expense.amount.toNumber()) {
        throw new InsufficientBalanceError();
      }

      const businessDate = expense.expenseDate ?? new Date();

      const transaction = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: expense.amount,
          description: `Pengeluaran ${expense.category.name}: ${expense.description}`,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - expense.amount.toNumber(),
          referenceId: expense.id,
          referenceType: 'EXPENSE',
          createdAt: businessDate,
        },
        select: { id: true, ledgerOrder: true },
      });

      const updated = await tx.expense.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: approverId,
          approvalNote: note,
          approvedAt: businessDate,
          transactionId: transaction.id,
        },
        include: {
          category: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });

      if (
        ledgerState.lastCreatedAt &&
        businessDate.getTime() < ledgerState.lastCreatedAt.getTime()
      ) {
        await rebuildLedgerTailFromOrder(tx, transaction.ledgerOrder);
      }

      return updated;
    });

    // Notify bendahara about approval - fire and forget
    notificationService.onExpenseApproved({
      id: result.id,
      requestedById: result.requestedBy.id,
      description: result.description,
    }).catch(() => {});

    return result;
  }

  async reject(id: string, approverId: string, note: string) {
    const expense = await this.findById(id);

    if (expense.status !== 'SUBMITTED') {
      throw new InvalidStatusError(expense.status, 'SUBMITTED');
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: approverId,
        approvalNote: note,
        approvedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // Notify bendahara about rejection - fire and forget
    notificationService.onExpenseRejected({
      id: updated.id,
      requestedById: updated.requestedBy.id,
      description: updated.description,
      reason: note,
    }).catch(() => {});

    return updated;
  }

  async update(id: string, input: UpdateExpenseInput) {
    const expense = await this.findById(id);

    if (expense.status === 'APPROVED') {
      throw new InvalidStatusError(expense.status, 'SUBMITTED/REJECTED/DRAFT');
    }

    const category = await prisma.expenseCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category || !category.isActive) {
      throw new NotFoundError('Kategori pengeluaran');
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        categoryId: input.categoryId,
        amount: input.amount,
        description: input.description,
        expenseDate: new Date(input.expenseDate),
        paymentMethod: input.paymentMethod,
        recipient: input.recipient,
        referenceNumber: input.referenceNumber,
        attachmentUrl: input.attachmentUrl,
      },
      include: {
        category: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async delete(id: string) {
    const expense = await this.findById(id);

    if (expense.status === 'APPROVED') {
      throw new InvalidStatusError(expense.status, 'SUBMITTED/REJECTED/DRAFT');
    }

    await prisma.expense.delete({ where: { id } });
    return { id };
  }
}

export const expenseService = new ExpenseService();
