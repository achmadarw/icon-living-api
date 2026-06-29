import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { UnauthorizedError, ValidationError, RateLimitError } from '../utils/errors';

const OTP_EXPIRES_MINUTES = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const ACTIVATION_TOKEN_EXPIRES_MINUTES = 10;

function normalizeUnitNumber(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s+/g, '');
  const parts = upper.match(/^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/);
  if (!parts) return upper;
  return `${parts[1]}-${parts[2].padStart(2, '0')}${parts[3] ?? ''}`;
}

function legacyUnitNumber(raw: string): string {
  return raw.replace(/-/g, '');
}

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  if (phone.length < 6) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

function hashText(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function sendOtpViaFonnte(
  phone: string,
  otp: string,
  account: { username: string; unitNumber: string },
): Promise<void> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return;

  const body = new URLSearchParams({
    target: phone,
    message: `Kode OTP aktivasi akun TIA untuk nomor unit/login ${account.username} (${account.unitNumber}): ${otp}. Berlaku ${OTP_EXPIRES_MINUTES} menit.`,
    countryCode: '62',
  });

  const resp = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!resp.ok) {
    throw new ValidationError('Gagal mengirim OTP ke WhatsApp');
  }
}

export class AccountActivationService {
  async listPendingUnits(query?: string) {
    const rows = await prisma.user.findMany({
      where: {
        isActive: true,
        isActivated: false,
        unitNumber: {
          not: null,
          ...(query ? { contains: query.toUpperCase() } : {}),
        },
      },
      select: {
        unitNumber: true,
        username: true,
        phone: true,
      },
      orderBy: { unitNumber: 'asc' },
      take: 200,
    });

    return rows
      .filter((row) => (row.unitNumber ?? '').length > 0)
      .map((row) => ({
        unitNumber: row.unitNumber ?? '',
        username: row.username,
        maskedPhone: maskPhone(row.phone),
      }));
  }

  async requestOtp(unitNumberRaw: string) {
    const unitNumber = normalizeUnitNumber(unitNumberRaw);
    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        isActivated: false,
        OR: [{ unitNumber }, { unitNumber: legacyUnitNumber(unitNumber) }],
      },
    });
    if (!user) throw new ValidationError('Data nomor rumah tidak ditemukan atau sudah aktif');
    if (!user.phone) throw new ValidationError('Nomor HP belum terdaftar untuk akun ini');

    const now = new Date();
    const lastOtp = await prisma.accountActivationOtp.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOtp?.cooldownUntil && lastOtp.cooldownUntil > now) {
      throw new RateLimitError();
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = hashText(otp);

    await prisma.accountActivationOtp.create({
      data: {
        userId: user.id,
        unitNumber,
        otpHash,
        expiresAt: new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000),
        cooldownUntil: new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
        resendCount: (lastOtp?.resendCount ?? 0) + 1,
      },
    });

    await sendOtpViaFonnte(user.phone, otp, {
      username: user.username,
      unitNumber,
    });

    return {
      unitNumber,
      username: user.username,
      maskedPhone: maskPhone(user.phone),
      expiresInSeconds: OTP_EXPIRES_MINUTES * 60,
    };
  }

  async verifyOtp(unitNumberRaw: string, otp: string) {
    const unitNumber = normalizeUnitNumber(unitNumberRaw);
    const now = new Date();
    const record = await prisma.accountActivationOtp.findFirst({
      where: {
        unitNumber,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < now) {
      throw new UnauthorizedError('OTP tidak valid atau sudah kadaluarsa');
    }
    if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new RateLimitError();
    }

    const valid = hashText(otp) === record.otpHash;
    if (!valid) {
      await prisma.accountActivationOtp.update({
        where: { id: record.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new UnauthorizedError('OTP salah');
    }

    const activationToken = crypto.randomBytes(24).toString('hex');
    await prisma.accountActivationOtp.update({
      where: { id: record.id },
      data: {
        verifiedAt: now,
        activationTokenHash: hashText(activationToken),
        activationTokenExpiresAt: new Date(now.getTime() + ACTIVATION_TOKEN_EXPIRES_MINUTES * 60 * 1000),
      },
    });

    return {
      unitNumber,
      activationToken,
      expiresInSeconds: ACTIVATION_TOKEN_EXPIRES_MINUTES * 60,
    };
  }

  async setPassword(unitNumberRaw: string, activationToken: string, password: string) {
    const unitNumber = normalizeUnitNumber(unitNumberRaw);
    const now = new Date();
    const tokenHash = hashText(activationToken);

    const record = await prisma.accountActivationOtp.findFirst({
      where: {
        unitNumber,
        consumedAt: null,
        activationTokenHash: tokenHash,
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    if (!record || !record.activationTokenExpiresAt || record.activationTokenExpiresAt < now) {
      throw new UnauthorizedError('Sesi aktivasi tidak valid atau kadaluarsa');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          isActivated: true,
          activatedAt: now,
        },
      }),
      prisma.accountActivationOtp.updateMany({
        where: { userId: record.userId, consumedAt: null },
        data: { consumedAt: now },
      }),
    ]);

    return { success: true, username: record.user.username };
  }
}

export const accountActivationService = new AccountActivationService();
