import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';
import { whatsappService } from './whatsapp.service';
import { whatsappDeliveryService } from './whatsapp-delivery.service';
import { resolveDelayRange, nextDelayMs, sleep } from '../utils/wa-throttle';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import type { NotificationType, Prisma } from '@prisma/client';

type Level = 'WARNING' | 'SUSPENSION';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Bulan paling awal yang punya kewajiban IPL (mencegah bulan lampau ikut dihitung).
const IPL_START_PERIOD = process.env.IPL_START_PERIOD ?? '2026-01';

// Template default (tertokenisasi) yang dipakai bila pengurus belum memilih
// template custom. Dipakai untuk pengiriman DAN pratinjau, agar konsisten.
const DEFAULT_WARNING_TEMPLATE = [
  'Halo {name},',
  '',
  'Kami mencatat pembayaran IPL unit {unitNumber} untuk periode {periode} belum kami terima hingga batas waktu tanggal 28.',
  '',
  'Mohon segera melakukan pembayaran IPL sebesar {nominal} agar tidak terkena sanksi penghentian layanan.',
  '',
  'Abaikan pesan ini bila Anda sudah membayar.',
  '',
  'Terima kasih.',
  'Pengurus The Icon Acropolis',
].join('\n');

const DEFAULT_SUSPENSION_TEMPLATE = [
  'Halo {name},',
  '',
  'Pembayaran IPL unit {unitNumber} tercatat menunggak 2 bulan berturut-turut ({periodeSebelumnya} dan {periode}).',
  '',
  'Sesuai ketentuan, layanan pengangkutan sampah untuk unit {unitNumber} akan DIHENTIKAN mulai {bulanBerlaku} sampai tunggakan dilunasi.',
  '',
  'Mohon segera melunasi IPL untuk mengaktifkan kembali layanan pengangkutan sampah.',
  '',
  'Terima kasih.',
  'Pengurus The Icon Acropolis',
].join('\n');

export interface ArrearsRunResult {
  ran: boolean;
  reason?: string;
  evaluatedPeriod?: string;
  previousPeriod?: string;
  suspensionStartPeriod?: string;
  warningCount: number;
  suspensionCount: number;
  skippedAlreadySent: number;
  suspendedUnits: Array<{ userId: string; name: string; unitNumber: string | null }>;
  errors: Array<{ userId: string; error: string }>;
}

export interface ArrearsPreviewItem {
  userId: string;
  name: string;
  unitNumber: string | null;
  role: string;
  hasPhone: boolean;
  unpaidCurrent: boolean;
  unpaidPrevious: boolean;
  level: 'NONE' | 'WARNING' | 'SUSPENSION';
  alreadyNotified: boolean;
}

export interface ArrearsPreview {
  evaluatedPeriod: string;
  previousPeriod: string;
  totalWarga: number;
  warningCount: number;
  suspensionCount: number;
  amanCount: number;
  items: ArrearsPreviewItem[];
}

export interface RunOptions {
  /** Jalankan walau hari ini bukan tanggal jadwal (untuk uji coba manual). */
  force?: boolean;
  /** Abaikan log idempotency dan kirim ulang (uji coba). Default false. */
  resend?: boolean;
  triggeredBy: 'cron' | 'manual';
}

function periodStr(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, '0')}`;
}

function humanPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Geser periode "YYYY-MM" sebanyak delta bulan (bisa negatif). */
function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodStr(d.getFullYear(), d.getMonth() + 1);
}

function rupiah(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export class ArrearsReminderService {
  /**
   * Tentukan bulan yang dievaluasi hari ini:
   * - tanggal 29 → bulan berjalan;
   * - tanggal 1 & bulan lalu hanya 28 hari (Feb non-kabisat) → bulan lalu;
   * - force → bulan berjalan;
   * - selain itu → null (bukan hari jadwal).
   */
  resolveEvaluatePeriod(now: Date, force?: boolean): string | null {
    if (force) return periodStr(now.getFullYear(), now.getMonth() + 1);

    const day = now.getDate();
    if (day === 29) {
      return periodStr(now.getFullYear(), now.getMonth() + 1);
    }
    if (day === 1) {
      // hari terakhir bulan sebelumnya
      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      if (lastPrev.getDate() === 28) {
        return periodStr(lastPrev.getFullYear(), lastPrev.getMonth() + 1);
      }
    }
    return null;
  }

  private async getIplPaymentTypeIds(): Promise<string[]> {
    const types = await prisma.paymentType.findMany({
      where: {
        isActive: true,
        OR: [
          { category: 'IPL' },
          { isMandatory: true },
          { name: { contains: 'IPL', mode: 'insensitive' } },
        ],
      },
      select: { id: true, fixedAmount: true },
    });
    return types.map((t) => t.id);
  }

  private async getIplMonthlyAmount(): Promise<number | null> {
    const type = await prisma.paymentType.findFirst({
      where: {
        isActive: true,
        fixedAmount: { not: null },
        OR: [
          { category: 'IPL' },
          { isMandatory: true },
          { name: { contains: 'IPL', mode: 'insensitive' } },
        ],
      },
      orderBy: { fixedAmount: 'asc' },
      select: { fixedAmount: true },
    });
    return type?.fixedAmount ? type.fixedAmount.toNumber() : null;
  }

  /**
   * Template penagihan yang sedang berlaku, sudah dirender dengan data contoh —
   * agar pengurus bisa melihat persis teks WhatsApp yang akan dikirim.
   */
  async getEffectiveTemplates(): Promise<{
    warning: { source: 'default' | 'custom'; templateName: string | null; preview: string };
    suspension: { source: 'default' | 'custom'; templateName: string | null; preview: string };
  }> {
    const settings = await this.getSettings();
    const amount = await this.getIplMonthlyAmount();

    const now = new Date();
    const period = periodStr(now.getFullYear(), now.getMonth() + 1);
    const periodPrev = shiftPeriod(period, -1);
    const startPeriod = shiftPeriod(period, 1);
    const sampleVars = { name: 'Budi Santoso', unit: 'A-12', period, periodPrev, startPeriod, amount };

    const resolve = async (templateId: string | null, fallback: string) => {
      const body = templateId ? (await this.getTemplateBody(templateId)) ?? fallback : fallback;
      let templateName: string | null = null;
      if (templateId) {
        const t = await prisma.messageTemplate.findUnique({ where: { id: templateId }, select: { name: true } });
        templateName = t?.name ?? null;
      }
      return {
        source: (templateId && templateName ? 'custom' : 'default') as 'default' | 'custom',
        templateName,
        preview: this.renderArrearsTemplate(body, sampleVars),
      };
    };

    return {
      warning: await resolve(settings.warningTemplateId, DEFAULT_WARNING_TEMPLATE),
      suspension: await resolve(settings.suspensionTemplateId, DEFAULT_SUSPENSION_TEMPLATE),
    };
  }

  /** Kirim in-app + WA ke satu warga. Error WA tidak menggagalkan proses. */
  private async notifyResident(
    user: { id: string; name: string; phone: string | null },
    type: NotificationType,
    title: string,
    message: string,
    period: string,
  ): Promise<void> {
    await notificationService.create({
      type,
      title,
      message,
      userId: user.id,
      referenceType: 'ARREARS',
      referenceId: period,
    });
    if (user.phone) {
      const result = await whatsappService.send({ target: user.phone, message }).catch((err) => {
        logger.warn('[arrears] WA gagal', { userId: user.id, error: String(err) });
        return null;
      });
      await whatsappDeliveryService.record({
        fonnteId: result?.fonnteId ?? null,
        target: user.phone,
        userId: user.id,
        name: user.name,
        unitNumber: null,
        source: this.deliverySource(type),
        batchId: period,
        status: result?.success ? 'SENT' : 'FAILED',
        errorMessage: result?.success ? null : (result?.error ?? 'Gagal mengirim WhatsApp'),
      });
    }
  }

  private deliverySource(type: NotificationType): string {
    if (type === 'ARREARS_WARNING') return 'ARREARS_WARNING';
    if (type === 'WASTE_SUSPENSION_WARNING') return 'ARREARS_SUSPENSION';
    if (type === 'WASTE_SERVICE_RESTORED') return 'WASTE_RESTORED';
    return 'ARREARS';
  }

  /**
   * Pratinjau read-only: hitung status tunggakan tiap warga untuk bulan
   * berjalan TANPA mengirim apa pun. Untuk ditinjau pengurus sebelum "Jalankan".
   */
  async previewCheck(): Promise<ArrearsPreview> {
    const now = new Date();
    const M = periodStr(now.getFullYear(), now.getMonth() + 1);
    const M1 = shiftPeriod(M, -1);

    const iplTypeIds = await this.getIplPaymentTypeIds();

    // Semua penghuni (punya nomor unit), lintas role — termasuk Ketua/Bendahara.
    // Akun tanpa unit (admin/eksternal) dikecualikan karena tidak wajib IPL.
    const users = await prisma.user.findMany({
      where: { isActive: true, unitNumber: { not: null } },
      select: { id: true, name: true, unitNumber: true, role: true, phone: true, createdAt: true },
      orderBy: { unitNumber: 'asc' },
    });

    const coveredPeriods =
      iplTypeIds.length === 0
        ? []
        : await prisma.paymentPeriod.findMany({
            where: {
              period: { in: [M1, M] },
              payment: { paymentTypeId: { in: iplTypeIds }, status: { in: ['APPROVED', 'PENDING'] } },
            },
            select: { period: true, payment: { select: { userId: true } } },
          });

    const covered = new Map<string, Set<string>>();
    for (const cp of coveredPeriods) {
      const uid = cp.payment.userId;
      if (!covered.has(uid)) covered.set(uid, new Set());
      covered.get(uid)!.add(cp.period);
    }

    const logs = await prisma.arrearsReminderLog.findMany({
      where: { period: M },
      select: { userId: true, level: true },
    });
    const sentSet = new Set(logs.map((l) => `${l.userId}:${l.level}`));

    const items: ArrearsPreviewItem[] = users.map((user) => {
      const userCreatedPeriod = periodStr(user.createdAt.getFullYear(), user.createdAt.getMonth() + 1);
      const userStart = userCreatedPeriod > IPL_START_PERIOD ? userCreatedPeriod : IPL_START_PERIOD;
      const set = covered.get(user.id) ?? new Set<string>();
      const unpaidCurrent = M >= userStart && !set.has(M);
      const unpaidPrevious = M1 >= userStart && !set.has(M1);

      let level: 'NONE' | 'WARNING' | 'SUSPENSION' = 'NONE';
      if (unpaidCurrent && unpaidPrevious) level = 'SUSPENSION';
      else if (unpaidCurrent) level = 'WARNING';

      return {
        userId: user.id,
        name: user.name,
        unitNumber: user.unitNumber,
        role: user.role,
        hasPhone: !!user.phone,
        unpaidCurrent,
        unpaidPrevious,
        level,
        alreadyNotified: level !== 'NONE' && sentSet.has(`${user.id}:${level}`),
      };
    });

    const warningCount = items.filter((i) => i.level === 'WARNING').length;
    const suspensionCount = items.filter((i) => i.level === 'SUSPENSION').length;
    const amanCount = items.filter((i) => i.level === 'NONE').length;

    return {
      evaluatedPeriod: M,
      previousPeriod: M1,
      totalWarga: items.length,
      warningCount,
      suspensionCount,
      amanCount,
      items,
    };
  }

  async runCheck(options: RunOptions): Promise<ArrearsRunResult> {
    const now = new Date();
    const evaluatePeriod = this.resolveEvaluatePeriod(now, options.force);

    if (!evaluatePeriod) {
      return {
        ran: false,
        reason: 'Bukan hari jadwal pengecekan (tanggal 29, atau 1 untuk Februari).',
        warningCount: 0,
        suspensionCount: 0,
        skippedAlreadySent: 0,
        suspendedUnits: [],
        errors: [],
      };
    }

    const M = evaluatePeriod;
    const M1 = shiftPeriod(M, -1);
    const suspensionStart = shiftPeriod(M, 1);

    const iplTypeIds = await this.getIplPaymentTypeIds();
    if (iplTypeIds.length === 0) {
      return {
        ran: false,
        reason: 'Tidak ada tipe pembayaran IPL aktif.',
        evaluatedPeriod: M,
        warningCount: 0,
        suspensionCount: 0,
        skippedAlreadySent: 0,
        suspendedUnits: [],
        errors: [],
      };
    }

    const iplAmount = await this.getIplMonthlyAmount();

    const settings = await this.getSettings();
    if (!settings.enabled && options.triggeredBy === 'cron') {
      return {
        ran: false,
        reason: 'Penagihan otomatis sedang dinonaktifkan.',
        evaluatedPeriod: M,
        previousPeriod: M1,
        suspensionStartPeriod: suspensionStart,
        warningCount: 0,
        suspensionCount: 0,
        skippedAlreadySent: 0,
        suspendedUnits: [],
        errors: [],
      };
    }
    const warningBody =
      (settings.warningTemplateId ? await this.getTemplateBody(settings.warningTemplateId) : null) ??
      DEFAULT_WARNING_TEMPLATE;
    const suspensionBody =
      (settings.suspensionTemplateId ? await this.getTemplateBody(settings.suspensionTemplateId) : null) ??
      DEFAULT_SUSPENSION_TEMPLATE;

    // Semua penghuni (punya nomor unit), lintas role.
    const users = await prisma.user.findMany({
      where: { isActive: true, unitNumber: { not: null } },
      select: { id: true, name: true, unitNumber: true, phone: true, createdAt: true },
    });

    // Bulan M-1 & M yang "tertutup" = ada pembayaran IPL APPROVED atau PENDING
    // (pending diberi tenggang → tidak dianggap menunggak).
    const coveredPeriods = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: [M1, M] },
        payment: {
          paymentTypeId: { in: iplTypeIds },
          status: { in: ['APPROVED', 'PENDING'] },
        },
      },
      select: { period: true, payment: { select: { userId: true } } },
    });

    const covered = new Map<string, Set<string>>();
    for (const cp of coveredPeriods) {
      const uid = cp.payment.userId;
      if (!covered.has(uid)) covered.set(uid, new Set());
      covered.get(uid)!.add(cp.period);
    }

    const result: ArrearsRunResult = {
      ran: true,
      evaluatedPeriod: M,
      previousPeriod: M1,
      suspensionStartPeriod: suspensionStart,
      warningCount: 0,
      suspensionCount: 0,
      skippedAlreadySent: 0,
      suspendedUnits: [],
      errors: [],
    };

    // Jeda acak antar warga agar nomor Fonnte tidak diblokir saat kirim massal.
    const delayRange = resolveDelayRange();
    let notified = 0;

    for (const user of users) {
      // Kewajiban warga dimulai dari bulan ia terdaftar, minimal IPL_START_PERIOD.
      const userStart =
        periodStr(user.createdAt.getFullYear(), user.createdAt.getMonth() + 1) > IPL_START_PERIOD
          ? periodStr(user.createdAt.getFullYear(), user.createdAt.getMonth() + 1)
          : IPL_START_PERIOD;

      const set = covered.get(user.id) ?? new Set<string>();
      const menunggakM = M >= userStart && !set.has(M);
      const menunggakM1 = M1 >= userStart && !set.has(M1);

      let level: Level | null = null;
      if (menunggakM && menunggakM1) level = 'SUSPENSION';
      else if (menunggakM) level = 'WARNING';
      if (!level) continue;

      const unit = user.unitNumber ?? '-';

      // Idempotency: catat log dulu (unik). Kalau sudah ada → lewati kirim.
      if (!options.resend) {
        try {
          await prisma.arrearsReminderLog.create({
            data: { userId: user.id, period: M, level },
          });
        } catch (err: any) {
          if (err?.code === 'P2002') {
            result.skippedAlreadySent += 1;
            continue;
          }
          throw err;
        }
      }

      try {
        // Sisipkan jeda sebelum warga ke-2 dan seterusnya yang benar-benar dikirimi.
        if (notified > 0) {
          await sleep(nextDelayMs(delayRange));
        }
        notified += 1;

        const vars = { name: user.name, unit, period: M, periodPrev: M1, startPeriod: suspensionStart, amount: iplAmount };
        if (level === 'WARNING') {
          const message = this.renderArrearsTemplate(warningBody, vars);
          await this.notifyResident(user, 'ARREARS_WARNING' as NotificationType, 'Pengingat Tunggakan IPL', message, M);
          result.warningCount += 1;
        } else {
          const message = this.renderArrearsTemplate(suspensionBody, vars);
          await this.notifyResident(
            user,
            'WASTE_SUSPENSION_WARNING' as NotificationType,
            'Penghentian Layanan Sampah',
            message,
            M,
          );

          // Catat suspensi bila belum ada yang aktif untuk warga ini.
          const existing = await prisma.wasteSuspension.findFirst({
            where: { userId: user.id, isActive: true },
            select: { id: true },
          });
          if (!existing) {
            await prisma.wasteSuspension.create({
              data: {
                userId: user.id,
                userName: user.name,
                unitNumber: user.unitNumber,
                startPeriod: suspensionStart,
                reason: `Menunggak IPL ${humanPeriod(M1)} & ${humanPeriod(M)}`,
              },
            });
          }
          result.suspensionCount += 1;
          result.suspendedUnits.push({ userId: user.id, name: user.name, unitNumber: user.unitNumber });
        }
      } catch (err: any) {
        result.errors.push({ userId: user.id, error: err?.message ?? String(err) });
      }
    }

    // Rekap ke pengurus bila ada unit yang distop.
    if (result.suspendedUnits.length > 0) {
      await this.notifyManagers(M, result);
    }

    logger.info('[arrears] run selesai', {
      triggeredBy: options.triggeredBy,
      evaluated: M,
      warnings: result.warningCount,
      suspensions: result.suspensionCount,
      skipped: result.skippedAlreadySent,
    });

    return result;
  }

  private async notifyManagers(period: string, result: ArrearsRunResult): Promise<void> {
    const managers = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['KETUA', 'BENDAHARA'] } },
      select: { id: true, name: true, phone: true },
    });

    const unitList = result.suspendedUnits
      .map((u) => `${u.unitNumber ?? '-'} (${u.name})`)
      .join(', ');

    const message = [
      `Ringkasan penagihan IPL ${humanPeriod(period)}:`,
      `- Peringatan tunggakan: ${result.warningCount} warga`,
      `- Penghentian sampah (menunggak 2 bulan): ${result.suspensionCount} unit`,
      '',
      `Unit yang layanannya dihentikan: ${unitList}`,
    ].join('\n');

    for (const m of managers) {
      await notificationService
        .create({
          type: 'WASTE_SUSPENSION_WARNING' as NotificationType,
          title: 'Rekap Penghentian Sampah',
          message,
          userId: m.id,
          referenceType: 'ARREARS_SUMMARY',
          referenceId: period,
        })
        .catch(() => undefined);
      if (m.phone) {
        await whatsappService.send({ target: m.phone, message }).catch(() => undefined);
      }
    }
  }

  // ─── Pengaturan & template ─────────────────────────────

  private async getSettings(): Promise<{
    enabled: boolean;
    warningTemplateId: string | null;
    suspensionTemplateId: string | null;
  }> {
    const row = await prisma.arrearsSetting.findUnique({ where: { id: 'singleton' } });
    return {
      enabled: row?.enabled ?? true,
      warningTemplateId: row?.warningTemplateId ?? null,
      suspensionTemplateId: row?.suspensionTemplateId ?? null,
    };
  }

  async getPublicSettings() {
    return this.getSettings();
  }

  async updateSettings(input: {
    enabled?: boolean;
    warningTemplateId?: string | null;
    suspensionTemplateId?: string | null;
  }) {
    const row = await prisma.arrearsSetting.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        enabled: input.enabled ?? true,
        warningTemplateId: input.warningTemplateId ?? null,
        suspensionTemplateId: input.suspensionTemplateId ?? null,
      },
      update: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.warningTemplateId !== undefined ? { warningTemplateId: input.warningTemplateId } : {}),
        ...(input.suspensionTemplateId !== undefined ? { suspensionTemplateId: input.suspensionTemplateId } : {}),
      },
    });
    return {
      enabled: row.enabled,
      warningTemplateId: row.warningTemplateId,
      suspensionTemplateId: row.suspensionTemplateId,
    };
  }

  private async getTemplateBody(id: string): Promise<string | null> {
    const t = await prisma.messageTemplate.findUnique({ where: { id }, select: { body: true } });
    return t?.body ?? null;
  }

  private toTemplateDto(t: {
    id: string;
    name: string;
    body: string;
    variables: Prisma.JsonValue;
    createdById: string | null;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: t.id,
      name: t.name,
      body: t.body,
      variables: Array.isArray(t.variables) ? t.variables : [],
      createdById: t.createdById,
      createdByName: t.createdByName,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  /**
   * Pastikan ada template asli (bisa diedit) untuk slot penagihan tertentu.
   * Jika belum ada, dibuat dari teks default lalu ditautkan ke pengaturan.
   */
  async ensureEditableTemplate(kind: 'warning' | 'suspension', actorId: string) {
    const systemKey = kind === 'warning' ? 'ARREARS_WARNING' : 'ARREARS_SUSPENSION';
    const settings = await this.getSettings();
    const linkedId = kind === 'warning' ? settings.warningTemplateId : settings.suspensionTemplateId;

    // 1. Template kanonik (bertanda systemKey) sudah ada?
    let tpl = await prisma.messageTemplate.findFirst({ where: { systemKey } });

    // 2. Belum ada systemKey tapi settings sudah menunjuk template → adopsi.
    if (!tpl && linkedId) {
      const linked = await prisma.messageTemplate.findUnique({ where: { id: linkedId } });
      if (linked) {
        tpl = await prisma.messageTemplate
          .update({ where: { id: linked.id }, data: { systemKey } })
          .catch(() => linked);
      }
    }

    // 3. Masih belum ada → buat baru. Unik via systemKey (aman dari duplikat).
    if (!tpl) {
      const name = kind === 'warning' ? 'Peringatan Tunggakan IPL' : 'Penghentian Layanan Sampah';
      const body = kind === 'warning' ? DEFAULT_WARNING_TEMPLATE : DEFAULT_SUSPENSION_TEMPLATE;
      const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
      tpl = await prisma.messageTemplate
        .create({
          data: {
            name,
            body,
            systemKey,
            variables: [] as unknown as Prisma.InputJsonValue,
            createdById: actorId,
            createdByName: actor?.name ?? null,
          },
        })
        .catch(async (err: any) => {
          if (err?.code === 'P2002') {
            return prisma.messageTemplate.findFirst({ where: { systemKey } });
          }
          throw err;
        });
    }

    if (!tpl) throw new NotFoundError('Gagal menyiapkan template penagihan');

    await this.updateSettings(
      kind === 'warning' ? { warningTemplateId: tpl.id } : { suspensionTemplateId: tpl.id },
    );

    return this.toTemplateDto(tpl);
  }

  /** Pastikan kedua template penagihan (peringatan & penghentian) ada sebagai baris. */
  async ensureAllTemplates(actorId: string): Promise<{ warningTemplateId: string; suspensionTemplateId: string }> {
    const warning = await this.ensureEditableTemplate('warning', actorId);
    const suspension = await this.ensureEditableTemplate('suspension', actorId);
    return { warningTemplateId: warning.id, suspensionTemplateId: suspension.id };
  }

  private renderArrearsTemplate(
    body: string,
    v: { name: string; unit: string; period: string; periodPrev: string; startPeriod: string; amount: number | null },
  ): string {
    return body
      .replaceAll('{name}', v.name)
      .replaceAll('{unitNumber}', v.unit)
      .replaceAll('{periode}', humanPeriod(v.period))
      .replaceAll('{periodeSebelumnya}', humanPeriod(v.periodPrev))
      .replaceAll('{bulanBerlaku}', humanPeriod(v.startPeriod))
      .replaceAll('{nominal}', v.amount ? rupiah(v.amount) : '')
      .replaceAll('{playStoreUrl}', process.env.PLAY_STORE_URL ?? '');
  }

  // ─── Riwayat & suspensi ────────────────────────────────

  async getRunHistory(): Promise<Array<{ period: string; warnings: number; suspensions: number }>> {
    const rows = await prisma.arrearsReminderLog.groupBy({
      by: ['period', 'level'],
      _count: { _all: true },
      orderBy: { period: 'desc' },
    });
    const map = new Map<string, { period: string; warnings: number; suspensions: number }>();
    for (const r of rows) {
      const entry = map.get(r.period) ?? { period: r.period, warnings: 0, suspensions: 0 };
      if (r.level === 'WARNING') entry.warnings = r._count._all;
      else if (r.level === 'SUSPENSION') entry.suspensions = r._count._all;
      map.set(r.period, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.period.localeCompare(a.period));
  }

  async liftSuspension(id: string): Promise<{ lifted: boolean }> {
    const s = await prisma.wasteSuspension.findUnique({ where: { id } });
    if (!s || !s.isActive) throw new NotFoundError('Suspensi aktif tidak ditemukan');
    await prisma.wasteSuspension.update({
      where: { id },
      data: { isActive: false, liftedAt: new Date(), liftedReason: 'Dicabut manual oleh pengurus' },
    });
    return { lifted: true };
  }

  // ─── Fase 2: auto-pulih saat pembayaran di-approve ─────

  private monthsBetween(startPeriod: string, endPeriod: string): string[] {
    const out: string[] = [];
    let cur = startPeriod;
    let guard = 0;
    while (cur <= endPeriod && guard < 240) {
      out.push(cur);
      cur = shiftPeriod(cur, 1);
      guard += 1;
    }
    return out;
  }

  /**
   * Dipanggil setelah pembayaran IPL di-approve. Bila warga punya suspensi
   * aktif dan sudah tidak lagi menunggak 2 bulan berturut-turut, cabut
   * suspensinya dan beri tahu warga + pengurus.
   */
  async reconcileSuspension(userId: string): Promise<{ lifted: boolean }> {
    const suspension = await prisma.wasteSuspension.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!suspension) return { lifted: false };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, unitNumber: true, createdAt: true },
    });
    if (!user) return { lifted: false };

    const now = new Date();
    const currentPeriod = periodStr(now.getFullYear(), now.getMonth() + 1);
    const userCreatedPeriod = periodStr(user.createdAt.getFullYear(), user.createdAt.getMonth() + 1);
    const userStart = userCreatedPeriod > IPL_START_PERIOD ? userCreatedPeriod : IPL_START_PERIOD;

    const months = this.monthsBetween(userStart, currentPeriod);
    if (months.length < 2) {
      // Tidak mungkin ada 2 bulan berturut → aman, cabut.
      await this.applyLift(suspension.id, user, currentPeriod);
      return { lifted: true };
    }

    const iplTypeIds = await this.getIplPaymentTypeIds();
    const coveredRows = await prisma.paymentPeriod.findMany({
      where: {
        period: { in: months },
        payment: { paymentTypeId: { in: iplTypeIds }, status: { in: ['APPROVED', 'PENDING'] }, userId },
      },
      select: { period: true },
    });
    const covered = new Set(coveredRows.map((r) => r.period));

    let hasConsecutive = false;
    for (let i = 0; i < months.length - 1; i += 1) {
      if (!covered.has(months[i]!) && !covered.has(months[i + 1]!)) {
        hasConsecutive = true;
        break;
      }
    }
    if (hasConsecutive) return { lifted: false };

    await this.applyLift(suspension.id, user, currentPeriod);
    return { lifted: true };
  }

  private async applyLift(
    suspensionId: string,
    user: { id: string; name: string; phone: string | null; unitNumber: string | null },
    currentPeriod: string,
  ): Promise<void> {
    await prisma.wasteSuspension.update({
      where: { id: suspensionId },
      data: { isActive: false, liftedAt: new Date(), liftedReason: 'Tunggakan IPL telah dilunasi' },
    });

    const unit = user.unitNumber ?? '-';
    const message = [
      `Halo ${user.name},`,
      '',
      'Terima kasih, pembayaran IPL Anda sudah kami terima dan tunggakan telah lunas.',
      `Layanan pengangkutan sampah untuk unit ${unit} DIAKTIFKAN KEMBALI.`,
      '',
      'Terima kasih.',
      'Pengurus The Icon Acropolis',
    ].join('\n');

    await this.notifyResident(
      { id: user.id, name: user.name, phone: user.phone },
      'WASTE_SERVICE_RESTORED' as NotificationType,
      'Layanan Sampah Dipulihkan',
      message,
      currentPeriod,
    );

    const managers = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['KETUA', 'BENDAHARA'] } },
      select: { id: true },
    });
    for (const m of managers) {
      await notificationService
        .create({
          type: 'WASTE_SERVICE_RESTORED' as NotificationType,
          title: 'Layanan Sampah Dipulihkan',
          message: `Unit ${unit} (${user.name}) telah melunasi tunggakan. Layanan sampah diaktifkan kembali.`,
          userId: m.id,
          referenceType: 'ARREARS_SUMMARY',
          referenceId: currentPeriod,
        })
        .catch(() => undefined);
    }
  }
}

export const arrearsReminderService = new ArrearsReminderService();
