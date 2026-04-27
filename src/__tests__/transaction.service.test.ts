import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { TransactionService } from '../services/transaction.service';

const service = new TransactionService();

describe('TransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return current balance from last transaction', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue({
        balanceAfter: { toNumber: () => 5000000 },
        createdAt: new Date(),
      });

      const result = await service.getBalance();
      expect(result.balance).toBe(5000000);
    });

    it('should return 0 if no transactions', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null);

      const result = await service.getBalance();
      expect(result.balance).toBe(0);
      expect(result.lastUpdated).toBeNull();
    });
  });

  describe('getSummary', () => {
    it('should return income/expense summary', async () => {
      prismaMock.$transaction.mockResolvedValue([
        { _sum: { amount: { toNumber: () => 1000000 } } },
        { _sum: { amount: { toNumber: () => 300000 } } },
      ]);

      const result = await service.getSummary(2026, 1);
      expect(result.totalIncome).toBe(1000000);
      expect(result.totalExpense).toBe(300000);
      expect(result.netIncome).toBe(700000);
      expect(result.period).toBe('2026-01');
    });

    it('should return yearly summary without month', async () => {
      prismaMock.$transaction.mockResolvedValue([
        { _sum: { amount: { toNumber: () => 5000000 } } },
        { _sum: { amount: null } },
      ]);

      const result = await service.getSummary(2026);
      expect(result.totalIncome).toBe(5000000);
      expect(result.totalExpense).toBe(0);
      expect(result.period).toBe('2026');
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const mockTx = [{ id: 'tx-1', type: 'INCOME', amount: 250000 }];
      prismaMock.$transaction.mockResolvedValue([mockTx, 1]);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      prismaMock.transaction.findFirst.mockResolvedValue({
        balanceAfter: { toNumber: () => 5000000 },
        createdAt: new Date(),
      });
      prismaMock.$transaction.mockResolvedValueOnce([
        { _sum: { amount: { toNumber: () => 1000000 } } },
        { _sum: { amount: { toNumber: () => 300000 } } },
      ]).mockResolvedValueOnce([10, 2, 50]);

      const result = await service.getDashboard();
      expect(result.balance).toBe(5000000);
      expect(result.pendingPayments).toBe(10);
      expect(result.pendingExpenses).toBe(2);
      expect(result.totalUsers).toBe(50);
    });
  });
});
