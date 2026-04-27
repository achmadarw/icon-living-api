import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { ExpenseService } from '../services/expense.service';

const service = new ExpenseService();

const mockCategory = {
  id: 'cat-1',
  name: 'Kebersihan',
  description: null,
  requiresApproval: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCategoryApproval = {
  ...mockCategory,
  id: 'cat-2',
  name: 'Renovasi',
  requiresApproval: true,
};

const mockExpense = {
  id: 'exp-1',
  amount: { toNumber: () => 500000 },
  description: 'Biaya kebersihan bulan ini',
  attachmentUrl: null,
  status: 'SUBMITTED',
  approvalNote: null,
  approvedAt: null,
  categoryId: 'cat-2',
  requestedById: 'user-1',
  approvedById: null,
  transactionId: null,
  category: { id: 'cat-2', name: 'Renovasi' },
  requestedBy: { id: 'user-1', name: 'Test' },
  approvedBy: null,
  transaction: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ExpenseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create submitted expense for category requiring approval', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(mockCategoryApproval);
      prismaMock.expense.create.mockResolvedValue({ ...mockExpense, status: 'SUBMITTED' });

      const result = await service.create('user-1', {
        categoryId: 'cat-2',
        amount: 500000,
        description: 'Biaya renovasi taman utama',
      });

      expect(result.status).toBe('SUBMITTED');
    });

    it('should auto-approve expense for auto-approve category', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(mockCategory);

      const txMock = {
        transaction: {
          findFirst: vi.fn().mockResolvedValue({ balanceAfter: { toNumber: () => 1000000 } }),
          create: vi.fn().mockResolvedValue({ id: 'tx-1' }),
          update: vi.fn().mockResolvedValue({}),
        },
        expense: {
          create: vi.fn().mockResolvedValue({ ...mockExpense, status: 'APPROVED', categoryId: 'cat-1' }),
        },
      };
      prismaMock.$transaction.mockImplementation((fn: any) => fn(txMock));

      const result = await service.create('user-1', {
        categoryId: 'cat-1',
        amount: 100000,
        description: 'Biaya kebersihan bulan ini',
      });

      expect(result.status).toBe('APPROVED');
    });

    it('should throw InsufficientBalanceError for auto-approve with low balance', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(mockCategory);

      const txMock = {
        transaction: {
          findFirst: vi.fn().mockResolvedValue({ balanceAfter: { toNumber: () => 100 } }),
          create: vi.fn(),
        },
        expense: { create: vi.fn() },
      };
      prismaMock.$transaction.mockImplementation((fn: any) => fn(txMock));

      await expect(service.create('user-1', {
        categoryId: 'cat-1',
        amount: 500000,
        description: 'Biaya kebersihan bulan ini',
      })).rejects.toThrow('Saldo kas tidak mencukupi');
    });

    it('should throw NotFoundError for inactive category', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue({ ...mockCategory, isActive: false });

      await expect(service.create('user-1', {
        categoryId: 'cat-1', amount: 100, description: 'Biaya kebersihan bulan ini',
      })).rejects.toThrow('Kategori pengeluaran tidak ditemukan');
    });
  });

  describe('approve', () => {
    it('should approve a submitted expense', async () => {
      prismaMock.expense.findUnique.mockResolvedValue(mockExpense);

      const txMock = {
        transaction: {
          findFirst: vi.fn().mockResolvedValue({ balanceAfter: { toNumber: () => 1000000 } }),
          create: vi.fn().mockResolvedValue({ id: 'tx-1' }),
        },
        expense: {
          update: vi.fn().mockResolvedValue({ ...mockExpense, status: 'APPROVED' }),
        },
      };
      prismaMock.$transaction.mockImplementation((fn: any) => fn(txMock));

      const result = await service.approve('exp-1', 'approver-1', 'Approved');
      expect(result.status).toBe('APPROVED');
    });

    it('should throw InvalidStatusError for non-submitted expense', async () => {
      prismaMock.expense.findUnique.mockResolvedValue({ ...mockExpense, status: 'DRAFT' });

      await expect(service.approve('exp-1', 'approver-1'))
        .rejects.toThrow("Status saat ini 'DRAFT'");
    });

    it('should throw InsufficientBalanceError when balance too low', async () => {
      prismaMock.expense.findUnique.mockResolvedValue(mockExpense);

      const txMock = {
        transaction: {
          findFirst: vi.fn().mockResolvedValue({ balanceAfter: { toNumber: () => 100 } }),
          create: vi.fn(),
        },
        expense: { update: vi.fn() },
      };
      prismaMock.$transaction.mockImplementation((fn: any) => fn(txMock));

      await expect(service.approve('exp-1', 'approver-1'))
        .rejects.toThrow('Saldo kas tidak mencukupi');
    });
  });

  describe('reject', () => {
    it('should reject a submitted expense', async () => {
      prismaMock.expense.findUnique.mockResolvedValue(mockExpense);
      prismaMock.expense.update.mockResolvedValue({ ...mockExpense, status: 'REJECTED' });

      const result = await service.reject('exp-1', 'approver-1', 'Budget exceeded');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      prismaMock.$transaction.mockResolvedValue([[mockExpense], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.expenses).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
