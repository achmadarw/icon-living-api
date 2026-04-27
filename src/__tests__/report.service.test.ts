import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { ReportService } from '../services/report.service';

const reportService = new ReportService();

describe('ReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIplMonthlyReport', () => {
    const iplType = {
      id: 'pt_ipl', name: 'IPL', fixedAmount: { toNumber: () => 250000 },
      isMandatory: true, isActive: true, description: null, createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return empty report when no IPL payment type exists', async () => {
      prismaMock.paymentType.findFirst.mockResolvedValue(null);

      const result = await reportService.getIplMonthlyReport({ month: 1, year: 2026 });

      expect(result.residents).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should return correct status per resident', async () => {
      prismaMock.paymentType.findFirst.mockResolvedValue(iplType);

      const users = [
        { id: 'u1', name: 'User A', unitNumber: 'A-01' },
        { id: 'u2', name: 'User B', unitNumber: 'A-02' },
        { id: 'u3', name: 'User C', unitNumber: 'B-01' },
      ];

      const paymentPeriods = [
        { period: '2026-01', payment: { id: 'p1', userId: 'u1', status: 'APPROVED' } },
        { period: '2026-01', payment: { id: 'p2', userId: 'u2', status: 'PENDING' } },
      ];

      prismaMock.$transaction.mockResolvedValue([users, paymentPeriods]);

      const result = await reportService.getIplMonthlyReport({ month: 1, year: 2026 });

      expect(result.residents).toHaveLength(3);
      expect(result.residents[0].status).toBe('LUNAS');
      expect(result.residents[1].status).toBe('PENDING');
      expect(result.residents[2].status).toBe('BELUM');
      expect(result.summary.lunas).toBe(1);
      expect(result.summary.pending).toBe(1);
      expect(result.summary.belumBayar).toBe(1);
    });

    it('should prefer APPROVED over PENDING for same user', async () => {
      prismaMock.paymentType.findFirst.mockResolvedValue(iplType);

      const users = [{ id: 'u1', name: 'User A', unitNumber: 'A-01' }];
      const paymentPeriods = [
        { period: '2026-01', payment: { id: 'p1', userId: 'u1', status: 'PENDING' } },
        { period: '2026-01', payment: { id: 'p2', userId: 'u1', status: 'APPROVED' } },
      ];

      prismaMock.$transaction.mockResolvedValue([users, paymentPeriods]);

      const result = await reportService.getIplMonthlyReport({ month: 1, year: 2026 });

      expect(result.residents[0].status).toBe('LUNAS');
    });

    it('should format period correctly', async () => {
      prismaMock.paymentType.findFirst.mockResolvedValue(iplType);
      prismaMock.$transaction.mockResolvedValue([[], []]);

      const result = await reportService.getIplMonthlyReport({ month: 3, year: 2026 });

      expect(result.period).toBe('2026-03');
    });
  });

  describe('getIncomeReport', () => {
    it('should return income items from approved payments', async () => {
      const mockPayments = [{
        id: 'pay-1', amount: { toNumber: () => 250000 }, status: 'APPROVED',
        reviewedAt: new Date('2026-01-15'), createdAt: new Date('2026-01-10'),
        user: { name: 'Budi', unitNumber: 'A-01' },
        paymentType: { name: 'IPL' },
        periods: [{ period: '2026-01' }],
      }];

      prismaMock.payment.findMany.mockResolvedValue(mockPayments);

      const result = await reportService.getIncomeReport({ year: 2026, month: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].userName).toBe('Budi');
      expect(result.items[0].amount).toBe(250000);
      expect(result.summary.totalAmount).toBe(250000);
      expect(result.summary.totalTransactions).toBe(1);
    });

    it('should handle empty results', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);

      const result = await reportService.getIncomeReport({ year: 2026 });

      expect(result.items).toHaveLength(0);
      expect(result.summary.totalAmount).toBe(0);
      expect(result.period).toBe('2026');
    });

    it('should include payment type filter label', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.paymentType.findUnique.mockResolvedValue({ name: 'IPL' });

      const result = await reportService.getIncomeReport({ year: 2026, paymentTypeId: 'pt-1' });

      expect(result.paymentTypeFilter).toBe('IPL');
    });
  });

  describe('getExpenseReport', () => {
    it('should return expense items with auto-approve flag', async () => {
      const mockExpenses = [
        {
          id: 'exp-1', amount: { toNumber: () => 500000 }, description: 'Gaji satpam', status: 'APPROVED',
          approvedAt: new Date('2026-01-20'), createdAt: new Date('2026-01-18'),
          requestedBy: { name: 'Bu Bendahara' },
          category: { name: 'Gaji Satpam', requiresApproval: false },
        },
        {
          id: 'exp-2', amount: { toNumber: () => 200000 }, description: 'Perbaikan pagar', status: 'APPROVED',
          approvedAt: new Date('2026-01-22'), createdAt: new Date('2026-01-19'),
          requestedBy: { name: 'Bu Bendahara' },
          category: { name: 'Perbaikan', requiresApproval: true },
        },
      ];

      prismaMock.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await reportService.getExpenseReport({ year: 2026, month: 1 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].isAutoApproved).toBe(true);
      expect(result.items[1].isAutoApproved).toBe(false);
      expect(result.summary.totalAmount).toBe(700000);
      expect(result.summary.autoApprovedCount).toBe(1);
      expect(result.summary.manualApprovedCount).toBe(1);
    });

    it('should include category filter label', async () => {
      prismaMock.expense.findMany.mockResolvedValue([]);
      prismaMock.expenseCategory.findUnique.mockResolvedValue({ name: 'Kebersihan' });

      const result = await reportService.getExpenseReport({ year: 2026, categoryId: 'cat-1' });

      expect(result.categoryFilter).toBe('Kebersihan');
    });
  });
});
