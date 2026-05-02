import { prisma } from '../lib/prisma';
import { emitToUser, emitToRole } from '../lib/socket';
import { sendFcmToTokens, isFirebaseReady } from '../lib/firebase';
import { fcmTokenService } from './fcm-token.service';
import type { NotificationType } from '@prisma/client';
import type { NotificationQuery } from '@tia/shared';

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  referenceId?: string;
  referenceType?: string;
}

/**
 * Fire-and-forget FCM push. Does NOT throw — push failure must never block
 * the underlying business operation (payment/expense/etc).
 *
 * Runs asynchronously: we intentionally do not `await` the caller so the
 * DB transaction + Socket emit return as fast as before.
 */
function dispatchPushAsync(
  userIds: string[],
  notif: { type: NotificationType; title: string; message: string; referenceId?: string | null; referenceType?: string | null },
): void {
  if (!isFirebaseReady() || userIds.length === 0) {
    console.log('[notification.dispatchPushAsync] ⚠️ SKIPPED', {
      firebaseReady: isFirebaseReady(),
      userIdsCount: userIds.length,
      userIds,
      notifType: notif.type,
    });
    return;
  }

  console.log('[notification.dispatchPushAsync] 📤 SCHEDULED', {
    userIds,
    notifType: notif.type,
    title: notif.title,
  });

  // Schedule on next tick — never block the current call stack.
  setImmediate(async () => {
    try {
      console.log('[notification.dispatchPushAsync] 🔍 GETTING FCM TOKENS for users:', userIds);
      const tokens = await fcmTokenService.getTokensForUsers(userIds);
      
      console.log('[notification.dispatchPushAsync] 📋 FCM TOKENS RETRIEVED', {
        userIds,
        tokensCount: tokens.length,
        tokens: tokens.slice(0, 3).map(t => `${t.substring(0, 20)}...`), // Log first 3 tokens truncated
      });
      
      if (tokens.length === 0) {
        console.warn('[notification.dispatchPushAsync] ❌ NO TOKENS FOUND for users:', userIds);
        return;
      }

      console.log('[notification.dispatchPushAsync] 🚀 SENDING FCM to', tokens.length, 'token(s)', {
        notifType: notif.type,
        title: notif.title,
      });
      
      const { invalidTokens, successCount, failureCount } = await sendFcmToTokens(tokens, {
        title: notif.title,
        body: notif.message,
        data: {
          type: notif.type,
          referenceId: notif.referenceId ?? '',
          referenceType: notif.referenceType ?? '',
        },
      });

      console.log('[notification.dispatchPushAsync] ✅ FCM SEND COMPLETE', {
        successCount,
        failureCount,
        invalidTokensCount: invalidTokens.length,
      });

      if (invalidTokens.length > 0) {
        console.log('[notification.dispatchPushAsync] 🧹 REMOVING', invalidTokens.length, 'invalid tokens');
        await fcmTokenService.removeInvalidTokens(invalidTokens);
      }
    } catch (err) {
      console.error('[notification.dispatchPushAsync] ❌ FAILED:', err);
    }
  });
}

export class NotificationService {
  async create(input: CreateNotificationInput) {
    console.log('\n\n========== 📬 NOTIFICATION CREATE START ==========');
    console.log('[notification.create] 📝 INPUT', {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
    });

    const notification = await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        userId: input.userId,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
      },
    });

    console.log('[notification.create] ✅ SAVED TO DB', {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });

    // Emit real-time notification
    console.log('[notification.create] 📡 EMITTING SOCKET EVENT to user:', input.userId);
    emitToUser(input.userId, 'notification:new', notification);
    console.log('[notification.create] ✅ SOCKET EMIT CALLED');

    // Fire-and-forget FCM push
    console.log('[notification.create] 🔔 DISPATCHING FCM ASYNC');
    dispatchPushAsync([input.userId], {
      type: input.type,
      title: input.title,
      message: input.message,
      referenceId: input.referenceId ?? null,
      referenceType: input.referenceType ?? null,
    });
    console.log('[notification.create] ✅ FCM DISPATCH SCHEDULED (async, fire-and-forget)');
    console.log('========== 📬 NOTIFICATION CREATE END ==========\n\n');

    return notification;
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return [];

    const notifications = await prisma.$transaction(
      inputs.map((input) =>
        prisma.notification.create({
          data: {
            type: input.type,
            title: input.title,
            message: input.message,
            userId: input.userId,
            referenceId: input.referenceId,
            referenceType: input.referenceType,
          },
        }),
      ),
    );

    // Emit real-time notifications to each user
    for (const notif of notifications) {
      emitToUser(notif.userId, 'notification:new', notif);
    }

    // Fire-and-forget FCM push — batched per-user list
    if (notifications.length > 0) {
      const first = notifications[0]!;
      dispatchPushAsync(
        notifications.map((n) => n.userId),
        {
          type: first.type,
          title: first.title,
          message: first.message,
          referenceId: first.referenceId,
          referenceType: first.referenceType,
        },
      );
    }

    return notifications;
  }

  async findByUser(userId: string, query: NotificationQuery) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where: { userId: string; isRead?: boolean } = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ─── Notification Triggers ────────────────────────────

  async onPaymentSubmitted(payment: {
    id: string;
    amount: number;
    userId: string;
    userName: string;
    paymentTypeName: string;
  }) {
    // Notify all BENDAHARA users
    const bendaharas = await prisma.user.findMany({
      where: { role: 'BENDAHARA', isActive: true },
      select: { id: true },
    });

    const notifications = await this.createMany(
      bendaharas.map((b) => ({
        type: 'PAYMENT_SUBMITTED' as NotificationType,
        title: 'Pembayaran Baru',
        message: `${payment.userName} mengirim bukti pembayaran ${payment.paymentTypeName} sebesar Rp ${payment.amount.toLocaleString('id-ID')}`,
        userId: b.id,
        referenceId: payment.id,
        referenceType: 'PAYMENT',
      })),
    );

    // Emit dashboard refresh event to bendahara role
    emitToRole('BENDAHARA', 'approval:refresh', { type: 'PAYMENT' });

    return notifications;
  }

  async onPaymentApproved(payment: {
    id: string;
    userId: string;
    paymentTypeName: string;
    amount: number;
  }) {
    console.log('\n\n========== 💳 PAYMENT APPROVED TRIGGER ==========');
    console.log('[notification.onPaymentApproved] 🔔 TRIGGERED', {
      paymentId: payment.id,
      userId: payment.userId,
      paymentType: payment.paymentTypeName,
      amount: payment.amount,
    });
    
    const result = await this.create({
      type: 'PAYMENT_APPROVED' as NotificationType,
      title: 'Pembayaran Disetujui',
      message: `Pembayaran ${payment.paymentTypeName} sebesar Rp ${payment.amount.toLocaleString('id-ID')} telah disetujui`,
      userId: payment.userId,
      referenceId: payment.id,
      referenceType: 'PAYMENT',
    });
    
    console.log('[notification.onPaymentApproved] ✅ NOTIFICATION CREATED', { id: result.id });
    console.log('========== 💳 PAYMENT APPROVED TRIGGER END ==========\n\n');
    
    return result;
  }

  async onPaymentRejected(payment: {
    id: string;
    userId: string;
    paymentTypeName: string;
    reason?: string;
  }) {
    const reasonText = payment.reason ? `: ${payment.reason}` : '';
    return this.create({
      type: 'PAYMENT_REJECTED' as NotificationType,
      title: 'Pembayaran Ditolak',
      message: `Pembayaran ${payment.paymentTypeName} ditolak${reasonText}`,
      userId: payment.userId,
      referenceId: payment.id,
      referenceType: 'PAYMENT',
    });
  }

  async onExpenseSubmitted(expense: {
    id: string;
    description: string;
    amount: number;
    requestedByName: string;
  }) {
    // Notify all KETUA users
    const ketuas = await prisma.user.findMany({
      where: { role: 'KETUA', isActive: true },
      select: { id: true },
    });

    const notifications = await this.createMany(
      ketuas.map((k) => ({
        type: 'EXPENSE_SUBMITTED' as NotificationType,
        title: 'Pengajuan Pengeluaran Baru',
        message: `${expense.requestedByName} mengajukan pengeluaran "${expense.description}" sebesar Rp ${expense.amount.toLocaleString('id-ID')}`,
        userId: k.id,
        referenceId: expense.id,
        referenceType: 'EXPENSE',
      })),
    );

    // Emit dashboard refresh event to ketua role
    emitToRole('KETUA', 'approval:refresh', { type: 'EXPENSE' });

    return notifications;
  }

  async onExpenseApproved(expense: {
    id: string;
    requestedById: string;
    description: string;
  }) {
    return this.create({
      type: 'EXPENSE_APPROVED' as NotificationType,
      title: 'Pengeluaran Disetujui',
      message: `Pengeluaran "${expense.description}" telah disetujui`,
      userId: expense.requestedById,
      referenceId: expense.id,
      referenceType: 'EXPENSE',
    });
  }

  async onExpenseRejected(expense: {
    id: string;
    requestedById: string;
    description: string;
    reason?: string;
  }) {
    const reasonText = expense.reason ? `: ${expense.reason}` : '';
    return this.create({
      type: 'EXPENSE_REJECTED' as NotificationType,
      title: 'Pengeluaran Ditolak',
      message: `Pengeluaran "${expense.description}" ditolak${reasonText}`,
      userId: expense.requestedById,
      referenceId: expense.id,
      referenceType: 'EXPENSE',
    });
  }

  async onExpenseAutoApproved(expense: {
    id: string;
    description: string;
    amount: number;
    requestedByName: string;
  }) {
    // Notify all KETUA users — pencairan otomatis
    const ketuas = await prisma.user.findMany({
      where: { role: 'KETUA', isActive: true },
      select: { id: true },
    });

    return this.createMany(
      ketuas.map((k) => ({
        type: 'EXPENSE_AUTO_APPROVED' as NotificationType,
        title: 'Pengeluaran Otomatis Tercatat',
        message: `${expense.requestedByName} mencatat pengeluaran "${expense.description}" sebesar Rp ${expense.amount.toLocaleString('id-ID')} (auto-approve)`,
        userId: k.id,
        referenceId: expense.id,
        referenceType: 'EXPENSE',
      })),
    );
  }

  async onUserCreated(user: { id: string; name: string }) {
    return this.create({
      type: 'USER_CREATED' as NotificationType,
      title: 'Selamat Datang!',
      message: `Halo ${user.name}, akun Anda telah berhasil dibuat. Silakan lengkapi profil Anda.`,
      userId: user.id,
    });
  }
}

export const notificationService = new NotificationService();
