import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError, InvalidStatusError, AppError } from '../utils/errors';
import { notificationService } from './notification.service';
import { acquireLedgerLock, getLastLedgerState, rebuildLedgerTailFromOrder } from './ledger.service';
import { logger } from '../utils/logger';
import type { CreatePaymentInput, CreateManualPaymentInput, PaymentQuery, ArrearsQuery } from '@tia/shared';

export class PaymentService {
  private async getIplPaymentTypeIds(requestedPaymentTypeId?: string): Promise<string[]> {
    const iplTypes = await prisma.paymentType.findMany({
      where: {
        isActive: true,
        OR: [
          { isMandatory: true },
          { name: { contains: 'IPL', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    const ids = iplTypes.map((type) => type.id);
    if (requestedPaymentTypeId && !ids.includes(requestedPaymentTypeId)) {
      const requestedType = await prisma.paymentType.findUnique({
        where: { id: requestedPaymentTypeId },
        select: { id: true, isActive: true },
      });
      if (requestedType?.isActive) ids.push(requestedType.id);
    }

    return ids;
  }

  async create(userId: string, input: CreatePaymentInput) {
    const paymentType = await prisma.paymentType.findUnique({
      where: { id: input.paymentTypeId },
    });
    if (!paymentType || !paymentType.isActive) {
      throw new NotFoundError('Jenis pembayaran');
    }

    // Check duplicate periods for this user + payment type
    const existingPeriods = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: input.periods },
        payment: {
          userId,
          paymentTypeId: input.paymentTypeId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      },
      select: { period: true },
    });

    if (existingPeriods.length > 0) {
      const dupes = existingPeriods.map((p) => p.period);
      throw new AppError(409, 'DUPLICATE', `Periode ${dupes.join(', ')} sudah pernah dibayar atau sedang diproses`);
    }

    // Calculate expected amount for fixed-amount types
    const expectedAmount = paymentType.fixedAmount
      ? paymentType.fixedAmount.toNumber() * input.periods.length
      : null;

    if (expectedAmount !== null && input.amount !== expectedAmount) {
      throw new AppError(400, 'VALIDATION_ERROR', `Nominal harus ${expectedAmount} untuk ${input.periods.length} periode`);
    }

    const payment = await prisma.payment.create({
      data: {
        amount: input.amount,
        bankName: input.bankName,
        accountName: input.accountName,
        transferDate: new Date(input.transferDate),
        proofImageUrl: input.proofImageUrl,
        description: input.description,
        userId,
        paymentTypeId: input.paymentTypeId,
        periods: {
          create: input.periods.map((period) => ({ period })),
        },
      },
      include: {
        periods: true,
        paymentType: true,
        user: { select: { id: true, name: true, unitNumber: true } },
      },
    });

    try {
      await notificationService.onPaymentSubmitted({
        id: payment.id,
        amount: input.amount,
        userId,
        userName: payment.user.name,
        paymentTypeName: payment.paymentType.name,
        periods: input.periods,
      });
    } catch (err) {
      // Pembayaran tetap berhasil, tapi kegagalan notifikasi harus terlihat di log.
      logger.error('Failed to notify bendahara about submitted payment', err);
    }

    return payment;
  }

  async findAll(query: PaymentQuery) {
    const { page = 1, limit = 20, status, paymentTypeId, userId, period, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status;
    if (paymentTypeId) where.paymentTypeId = paymentTypeId;
    if (userId) where.userId = userId;
    if (period) {
      where.periods = { some: { period } };
    }
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { unitNumber: { contains: search, mode: 'insensitive' } } },
        { bankName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          periods: true,
          paymentType: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, unitNumber: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  async createManualApproved(reviewerId: string, input: CreateManualPaymentInput) {
    const paymentType = await prisma.paymentType.findUnique({
      where: { id: input.paymentTypeId },
    });
    if (!paymentType || !paymentType.isActive) {
      throw new NotFoundError('Jenis pembayaran');
    }

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundError('Warga');
    }

    const existingPeriods = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: input.periods },
        payment: {
          userId: input.userId,
          paymentTypeId: input.paymentTypeId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      },
      select: { period: true },
    });
    if (existingPeriods.length > 0) {
      const dupes = existingPeriods.map((p) => p.period);
      throw new AppError(409, 'DUPLICATE', `Periode ${dupes.join(', ')} sudah pernah dibayar atau sedang diproses`);
    }

    const expectedAmount = paymentType.fixedAmount
      ? paymentType.fixedAmount.toNumber() * input.periods.length
      : null;
    if (expectedAmount !== null && input.amount !== expectedAmount) {
      throw new AppError(400, 'VALIDATION_ERROR', `Nominal harus ${expectedAmount} untuk ${input.periods.length} periode`);
    }

    const transferDate = new Date(input.transferDate);

    const created = await prisma.$transaction(async (tx) => {
      await acquireLedgerLock(tx);
      const ledgerState = await getLastLedgerState(tx);

      const payment = await tx.payment.create({
        data: {
          amount: input.amount,
          bankName: input.bankName,
          accountName: input.accountName,
          transferDate,
          proofImageUrl: input.proofImageUrl ?? 'manual://prelaunch-entry',
          description: input.description ?? 'Pencatatan manual pre-launch',
          userId: input.userId,
          paymentTypeId: input.paymentTypeId,
          status: 'APPROVED',
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote: 'Disetujui otomatis: input manual pengurus',
          periods: {
            create: input.periods.map((period) => ({ period })),
          },
        },
        include: {
          periods: true,
          paymentType: true,
          user: { select: { id: true, name: true, unitNumber: true } },
        },
      });

      let currentBalance = ledgerState.balance;
      const amountPerPeriod = payment.amount.toNumber() / payment.periods.length;
      let firstInsertedOrder: bigint | null = null;

      for (const period of payment.periods) {
        const balanceBefore = currentBalance;
        const balanceAfter = currentBalance + amountPerPeriod;

        const createdTx = await tx.transaction.create({
          data: {
            type: 'INCOME',
            amount: amountPerPeriod,
            description: `Pembayaran ${payment.paymentType.name} periode ${period.period} (manual)`,
            balanceBefore,
            balanceAfter,
            referenceId: payment.id,
            referenceType: 'PAYMENT',
            createdAt: transferDate,
          },
          select: { ledgerOrder: true },
        });
        if (!firstInsertedOrder) firstInsertedOrder = createdTx.ledgerOrder;
        currentBalance = balanceAfter;
      }

      if (
        firstInsertedOrder &&
        ledgerState.lastCreatedAt &&
        transferDate.getTime() < ledgerState.lastCreatedAt.getTime()
      ) {
        await rebuildLedgerTailFromOrder(tx, firstInsertedOrder);
      }

      return payment;
    });

    return created;
  }

  async findById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        periods: true,
        paymentType: true,
        user: { select: { id: true, name: true, unitNumber: true, username: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (!payment) {
      throw new NotFoundError('Pembayaran');
    }

    return payment;
  }

  async findByUser(userId: string, query: PaymentQuery) {
    return this.findAll({ ...query, userId });
  }

  async updateProofImage(id: string, proofImageUrl: string) {
    await this.findById(id);

    return prisma.payment.update({
      where: { id },
      data: { proofImageUrl },
      include: {
        periods: true,
        paymentType: true,
        user: { select: { id: true, name: true, unitNumber: true, username: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
  }

  async approve(id: string, reviewerId: string, note?: string) {
    const payment = await this.findById(id);

    if (payment.status !== 'PENDING') {
      throw new InvalidStatusError(payment.status, 'PENDING');
    }

    // Create N transactions (one per period) inside a single transaction
    const result = await prisma.$transaction(async (tx) => {
      await acquireLedgerLock(tx);
      const ledgerState = await getLastLedgerState(tx);
      let currentBalance = ledgerState.balance;
      const amountPerPeriod = payment.amount.toNumber() / payment.periods.length;
      let firstInsertedOrder: bigint | null = null;

      for (const period of payment.periods) {
        const balanceBefore = currentBalance;
        const balanceAfter = currentBalance + amountPerPeriod;

        const createdTx = await tx.transaction.create({
          data: {
            type: 'INCOME',
            amount: amountPerPeriod,
            description: `Pembayaran ${payment.paymentType.name} periode ${period.period}`,
            balanceBefore,
            balanceAfter,
            referenceId: payment.id,
            referenceType: 'PAYMENT',
          },
          select: { ledgerOrder: true },
        });
        if (!firstInsertedOrder) firstInsertedOrder = createdTx.ledgerOrder;

        currentBalance = balanceAfter;
      }

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: reviewerId,
          reviewNote: note,
          reviewedAt: new Date(),
        },
        include: {
          periods: true,
          paymentType: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, unitNumber: true } },
        },
      });

      if (
        firstInsertedOrder &&
        ledgerState.lastCreatedAt &&
        payment.transferDate.getTime() < ledgerState.lastCreatedAt.getTime()
      ) {
        await rebuildLedgerTailFromOrder(tx, firstInsertedOrder);
      }

      return updated;
    });

    // Notify warga about approval - fire and forget
    notificationService.onPaymentApproved({
      id: result.id,
      userId: result.user.id,
      paymentTypeName: result.paymentType.name,
      amount: result.amount.toNumber(),
    }).catch(() => {});

    return result;
  }

  async reject(id: string, reviewerId: string, note: string) {
    const payment = await this.findById(id);

    if (payment.status !== 'PENDING') {
      throw new InvalidStatusError(payment.status, 'PENDING');
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewNote: note,
        reviewedAt: new Date(),
      },
      include: {
        periods: true,
        paymentType: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, unitNumber: true } },
      },
    });

    // Notify warga about rejection - fire and forget
    notificationService.onPaymentRejected({
      id: updated.id,
      userId: updated.user.id,
      paymentTypeName: updated.paymentType.name,
      reason: note,
    }).catch(() => {});

    return updated;
  }

  async getArrears(query: ArrearsQuery) {
    const { paymentTypeId, userId, year } = query;

    // All months in the year
    const allMonths = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`
    );

    // Find who should pay (all active warga, or specific user)
    const userWhere: Prisma.UserWhereInput = { isActive: true };
    if (userId) userWhere.id = userId;

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, unitNumber: true },
    });

    const iplPaymentTypeIds = await this.getIplPaymentTypeIds(paymentTypeId);

    // Find all approved IPL payments for this year.
    // IPL 100 and IPL 200 both settle the same monthly obligation.
    const approvedPeriods = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: allMonths },
        payment: {
          paymentTypeId: { in: iplPaymentTypeIds },
          status: 'APPROVED',
          ...(userId ? { userId } : {}),
        },
      },
      select: {
        period: true,
        payment: { select: { userId: true } },
      },
    });

    // Also find pending periods
    const pendingPeriods = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: allMonths },
        payment: {
          paymentTypeId: { in: iplPaymentTypeIds },
          status: 'PENDING',
          ...(userId ? { userId } : {}),
        },
      },
      select: {
        period: true,
        payment: { select: { userId: true } },
      },
    });

    // Build paid/pending sets per user
    const paidMap = new Map<string, Set<string>>();
    const pendingMap = new Map<string, Set<string>>();

    for (const p of approvedPeriods) {
      const uid = p.payment.userId;
      if (!paidMap.has(uid)) paidMap.set(uid, new Set());
      paidMap.get(uid)!.add(p.period);
    }

    for (const p of pendingPeriods) {
      const uid = p.payment.userId;
      if (!pendingMap.has(uid)) pendingMap.set(uid, new Set());
      pendingMap.get(uid)!.add(p.period);
    }

    // const currentMonth = new Date().toISOString().slice(0, 7);
    const relevantMonths = allMonths;

    const arrears = users.map((user) => {
      const paid = paidMap.get(user.id) ?? new Set();
      const pending = pendingMap.get(user.id) ?? new Set();
      const unpaid = relevantMonths.filter((m) => !paid.has(m) && !pending.has(m));

      return {
        user,
        paidMonths: relevantMonths.filter((m) => paid.has(m)),
        pendingMonths: relevantMonths.filter((m) => pending.has(m)),
        unpaidMonths: unpaid,
        totalUnpaid: unpaid.length,
      };
    });

    return arrears;
  }
}

export const paymentService = new PaymentService();

