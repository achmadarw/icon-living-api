import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './mocks/prisma.mock';

// Mock socket module before importing the service
vi.mock('../lib/socket', () => ({
  emitToUser: vi.fn(),
  emitToRole: vi.fn(),
}));

import { NotificationService } from '../services/notification.service';

const service = new NotificationService();

const mockNotification = {
  id: 'notif-1',
  type: 'PAYMENT_SUBMITTED',
  title: 'Pembayaran Baru',
  message: 'Test mengirim bukti pembayaran IPL sebesar Rp 500.000',
  referenceId: 'pay-1',
  referenceType: 'PAYMENT',
  isRead: false,
  readAt: null,
  userId: 'user-1',
  createdAt: new Date(),
};

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        type: 'PAYMENT_SUBMITTED' as any,
        title: 'Pembayaran Baru',
        message: 'Test message',
        userId: 'user-1',
        referenceId: 'pay-1',
        referenceType: 'PAYMENT',
      });

      expect(result.id).toBe('notif-1');
      expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    });
  });

  describe('createMany', () => {
    it('should create multiple notifications', async () => {
      const notif1 = { ...mockNotification, id: 'notif-1', userId: 'user-1' };
      const notif2 = { ...mockNotification, id: 'notif-2', userId: 'user-2' };
      prismaMock.$transaction.mockResolvedValue([notif1, notif2]);

      const result = await service.createMany([
        { type: 'PAYMENT_SUBMITTED' as any, title: 'Test', message: 'msg', userId: 'user-1' },
        { type: 'PAYMENT_SUBMITTED' as any, title: 'Test', message: 'msg', userId: 'user-2' },
      ]);

      expect(result).toHaveLength(2);
      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });

    it('should return empty array for empty input', async () => {
      const result = await service.createMany([]);
      expect(result).toEqual([]);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications with unread count', async () => {
      prismaMock.$transaction.mockResolvedValue([
        [mockNotification],
        1,
        1,
      ]);

      const result = await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(1);
    });

    it('should filter by isRead', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0, 0]);

      await service.findByUser('user-1', { page: 1, limit: 20, isRead: true });

      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      prismaMock.notification.count.mockResolvedValue(5);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(5);
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('notif-1', 'user-1');

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead('user-1');

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('onPaymentSubmitted', () => {
    it('should create notifications for all bendahara users', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'bendahara-1' },
        { id: 'bendahara-2' },
      ]);
      prismaMock.$transaction.mockResolvedValue([
        { ...mockNotification, userId: 'bendahara-1' },
        { ...mockNotification, userId: 'bendahara-2' },
      ]);

      const result = await service.onPaymentSubmitted({
        id: 'pay-1',
        amount: 500000,
        userId: 'warga-1',
        userName: 'Test Warga',
        paymentTypeName: 'IPL',
      });

      expect(result).toHaveLength(2);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: 'BENDAHARA', isActive: true },
        select: { id: true },
      });
    });
  });

  describe('onPaymentApproved', () => {
    it('should create notification for the payment submitter', async () => {
      prismaMock.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'PAYMENT_APPROVED',
      });

      const result = await service.onPaymentApproved({
        id: 'pay-1',
        userId: 'warga-1',
        paymentTypeName: 'IPL',
        amount: 500000,
      });

      expect(result.type).toBe('PAYMENT_APPROVED');
    });
  });

  describe('onPaymentRejected', () => {
    it('should create notification with rejection reason', async () => {
      prismaMock.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'PAYMENT_REJECTED',
        message: 'Pembayaran IPL ditolak: Bukti tidak jelas',
      });

      const result = await service.onPaymentRejected({
        id: 'pay-1',
        userId: 'warga-1',
        paymentTypeName: 'IPL',
        reason: 'Bukti tidak jelas',
      });

      expect(result.type).toBe('PAYMENT_REJECTED');
      expect(result.message).toContain('Bukti tidak jelas');
    });
  });

  describe('onExpenseSubmitted', () => {
    it('should create notifications for all ketua users', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'ketua-1' }]);
      prismaMock.$transaction.mockResolvedValue([
        { ...mockNotification, type: 'EXPENSE_SUBMITTED', userId: 'ketua-1' },
      ]);

      const result = await service.onExpenseSubmitted({
        id: 'exp-1',
        description: 'Biaya kebersihan',
        amount: 200000,
        requestedByName: 'Bendahara',
      });

      expect(result).toHaveLength(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: 'KETUA', isActive: true },
        select: { id: true },
      });
    });
  });

  describe('onExpenseAutoApproved', () => {
    it('should notify ketua about auto-approved expense', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'ketua-1' }]);
      prismaMock.$transaction.mockResolvedValue([
        { ...mockNotification, type: 'EXPENSE_AUTO_APPROVED', userId: 'ketua-1' },
      ]);

      const result = await service.onExpenseAutoApproved({
        id: 'exp-1',
        description: 'Biaya listrik',
        amount: 300000,
        requestedByName: 'Bendahara',
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('onUserCreated', () => {
    it('should create welcome notification for new user', async () => {
      prismaMock.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'USER_CREATED',
        title: 'Selamat Datang!',
        userId: 'new-user-1',
      });

      const result = await service.onUserCreated({ id: 'new-user-1', name: 'Warga Baru' });

      expect(result.type).toBe('USER_CREATED');
      expect(result.title).toBe('Selamat Datang!');
    });
  });
});
