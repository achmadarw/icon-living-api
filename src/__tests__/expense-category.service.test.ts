import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { ExpenseCategoryService } from '../services/expense-category.service';

const service = new ExpenseCategoryService();

const mockCat = {
  id: 'cat-1',
  name: 'Kebersihan',
  description: 'Biaya kebersihan',
  requiresApproval: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ExpenseCategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category', async () => {
      prismaMock.expenseCategory.create.mockResolvedValue(mockCat);

      const result = await service.create({ name: 'Kebersihan', requiresApproval: false });
      expect(result.name).toBe('Kebersihan');
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      prismaMock.expenseCategory.findMany.mockResolvedValue([mockCat]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError for missing category', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(null);
      await expect(service.findById('xxx')).rejects.toThrow('Kategori pengeluaran tidak ditemukan');
    });
  });

  describe('delete', () => {
    it('should delete if no expenses exist', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(mockCat);
      prismaMock.expense.count.mockResolvedValue(0);
      prismaMock.expenseCategory.delete.mockResolvedValue(mockCat);

      await expect(service.delete('cat-1')).resolves.not.toThrow();
    });

    it('should throw if expenses exist', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(mockCat);
      prismaMock.expense.count.mockResolvedValue(3);

      await expect(service.delete('cat-1')).rejects.toThrow('sudah memiliki pengeluaran');
    });
  });
});
