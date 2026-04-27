import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

const mockPaymentType = {
  id: 'pt-1',
  name: 'IPL',
  description: null,
  fixedAmount: { toNumber: () => 250000 },
  isMandatory: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPayment = {
  id: 'pay-1',
  amount: { toNumber: () => 500000 },
  bankName: 'BCA',
  accountName: 'Test',
  transferDate: new Date(),
  proofImageUrl: 'https://example.com/proof.jpg',
  description: null,
  status: 'PENDING',
  reviewNote: null,
  reviewedAt: null,
  userId: 'user-1',
  paymentTypeId: 'pt-1',
  reviewedById: null,
  periods: [
    { id: 'pp-1', period: '2026-01', paymentId: 'pay-1' },
    { id: 'pp-2', period: '2026-02', paymentId: 'pay-1' },
  ],
  paymentType: { id: 'pt-1', name: 'IPL' },
  user: { id: 'user-1', name: 'Test User', unitNumber: 'A-01' },
  reviewedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a payment with multiple periods', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(mockPaymentType);
      prismaMock.paymentPeriod.findMany.mockResolvedValue([]);
      prismaMock.payment.create.mockResolvedValue(mockPayment);

      const result = await paymentService.create('user-1', {
        paymentTypeId: 'pt-1',
        amount: 500000,
        bankName: 'BCA',
        transferDate: '2026-01-15T00:00:00.000Z',
        proofImageUrl: 'https://example.com/proof.jpg',
        periods: ['2026-01', '2026-02'],
      });

      expect(result.id).toBe('pay-1');
      expect(prismaMock.payment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError for inactive payment type', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue({ ...mockPaymentType, isActive: false });

      await expect(paymentService.create('user-1', {
        paymentTypeId: 'pt-1', amount: 250000, bankName: 'BCA',
        transferDate: '2026-01-15T00:00:00.000Z',
        proofImageUrl: 'https://example.com/proof.jpg',
        periods: ['2026-01'],
      })).rejects.toThrow('Jenis pembayaran tidak ditemukan');
    });

    it('should throw for duplicate periods', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(mockPaymentType);
      prismaMock.paymentPeriod.findMany.mockResolvedValue([{ period: '2026-01' }]);

      await expect(paymentService.create('user-1', {
        paymentTypeId: 'pt-1', amount: 250000, bankName: 'BCA',
        transferDate: '2026-01-15T00:00:00.000Z',
        proofImageUrl: 'https://example.com/proof.jpg',
        periods: ['2026-01'],
      })).rejects.toThrow('sudah pernah dibayar');
    });

    it('should throw for wrong amount on fixed-price type', async () => {
      prismaMock.paymentType.findUnique.mockResolvedValue(mockPaymentType);
      prismaMock.paymentPeriod.findMany.mockResolvedValue([]);

      await expect(paymentService.create('user-1', {
        paymentTypeId: 'pt-1', amount: 100000, bankName: 'BCA',
        transferDate: '2026-01-15T00:00:00.000Z',
        proofImageUrl: 'https://example.com/proof.jpg',
        periods: ['2026-01'],
      })).rejects.toThrow('Nominal harus');
    });
  });

  describe('findAll', () => {
    it('should return paginated payments', async () => {
      prismaMock.$transaction.mockResolvedValue([[mockPayment], 1]);

      const result = await paymentService.findAll({ page: 1, limit: 20 });
      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return payment by id', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await paymentService.findById('pay-1');
      expect(result.id).toBe('pay-1');
    });

    it('should throw NotFoundError for missing payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await expect(paymentService.findById('nonexistent'))
        .rejects.toThrow('Pembayaran tidak ditemukan');
    });
  });

  describe('approve', () => {
    it('should approve a pending payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);

      const txMock = {
        transaction: {
          findFirst: vi.fn().mockResolvedValue({ balanceAfter: { toNumber: () => 1000000 } }),
          create: vi.fn().mockResolvedValue({}),
        },
        payment: {
          update: vi.fn().mockResolvedValue({ ...mockPayment, status: 'APPROVED' }),
        },
      };
      prismaMock.$transaction.mockImplementation((fn: any) => fn(txMock));

      const result = await paymentService.approve('pay-1', 'reviewer-1', 'OK');
      expect(result.status).toBe('APPROVED');
    });

    it('should throw InvalidStatusError for non-pending payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ ...mockPayment, status: 'APPROVED' });

      await expect(paymentService.approve('pay-1', 'reviewer-1'))
        .rejects.toThrow("Status saat ini 'APPROVED'");
    });
  });

  describe('reject', () => {
    it('should reject a pending payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      prismaMock.payment.update.mockResolvedValue({ ...mockPayment, status: 'REJECTED' });

      const result = await paymentService.reject('pay-1', 'reviewer-1', 'Bukti tidak jelas');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw InvalidStatusError for non-pending payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({ ...mockPayment, status: 'REJECTED' });

      await expect(paymentService.reject('pay-1', 'reviewer-1', 'note'))
        .rejects.toThrow("Status saat ini 'REJECTED'");
    });
  });
});
