import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { PaymentTypeService } from '../services/payment-type.service';

const paymentTypeService = new PaymentTypeService();

const mockPT = {
  id: 'pt-1',
  name: 'IPL',
  description: 'Iuran Pengelolaan Lingkungan',
  fixedAmount: { toNumber: () => 250000 },
  isMandatory: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PaymentTypeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a payment type', async () => {
      prismaMock.paymentType.create.mockResolvedValue(mockPT);

      const result = await paymentTypeService.create({
        name: 'IPL', fixedAmount: 250000, isMandatory: true,
      });

      expect(result.name).toBe('IPL');
    });
  });

  describe('findAll', () => {
    it('should return all payment types', async () => {
      prismaMock.paymentType.findMany.mockResolvedValue([mockPT]);

      const result = await paymentTypeService.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return payment type by id', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(mockPT);

      const result = await paymentTypeService.findById('pt-1');
      expect(result.name).toBe('IPL');
    });

    it('should throw NotFoundError for missing type', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(null);

      await expect(paymentTypeService.findById('nonexistent'))
        .rejects.toThrow('Jenis pembayaran tidak ditemukan');
    });
  });

  describe('delete', () => {
    it('should delete if no payments exist', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(mockPT);
      prismaMock.payment.count.mockResolvedValue(0);
      prismaMock.paymentType.delete.mockResolvedValue(mockPT);

      await expect(paymentTypeService.delete('pt-1')).resolves.not.toThrow();
    });

    it('should throw if payments exist', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(mockPT);
      prismaMock.payment.count.mockResolvedValue(5);

      await expect(paymentTypeService.delete('pt-1'))
        .rejects.toThrow('sudah memiliki pembayaran');
    });
  });
});
