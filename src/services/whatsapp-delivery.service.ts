import { prisma } from '../lib/prisma';

export interface RecordDeliveryInput {
  fonnteId: string | null;
  target: string;
  userId?: string | null;
  name?: string | null;
  unitNumber?: string | null;
  source: string; // BROADCAST | ARREARS_WARNING | ARREARS_SUSPENSION | WASTE_RESTORED
  batchId?: string | null;
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
}

export interface FonnteStatusPayload {
  device?: string;
  id?: string;
  stateid?: string;
  status?: string;
  state?: string;
}

export class WhatsappDeliveryService {
  /** Simpan satu catatan pengiriman (dipanggil setelah whatsappService.send). */
  async record(input: RecordDeliveryInput): Promise<void> {
    try {
      await prisma.whatsappDelivery.create({
        data: {
          fonnteId: input.fonnteId,
          target: input.target,
          userId: input.userId ?? null,
          name: input.name ?? null,
          unitNumber: input.unitNumber ?? null,
          source: input.source,
          batchId: input.batchId ?? null,
          status: input.status,
          errorMessage: input.errorMessage ?? null,
        },
      });
    } catch {
      // Pencatatan delivery tidak boleh menggagalkan proses kirim.
    }
  }

  /** Petakan status/state mentah Fonnte ke status normalisasi kita. */
  private normalizeStatus(status?: string, state?: string): string | null {
    const s = `${status ?? ''} ${state ?? ''}`.toLowerCase();
    if (/read|dibaca/.test(s)) return 'READ';
    if (/deliver|terkirim|sampai|received/.test(s)) return 'DELIVERED';
    if (/fail|gagal|error|invalid|not.?found|reject/.test(s)) return 'FAILED';
    if (/sent|send|process|pending|antri|queue/.test(s)) return 'SENT';
    return null;
  }

  /** Update status dari webhook Fonnte. Cocokkan berdasarkan message id / stateid. */
  async updateFromWebhook(payload: FonnteStatusPayload): Promise<{ updated: number }> {
    const id = payload.id ? String(payload.id) : undefined;
    const stateId = payload.stateid ? String(payload.stateid) : undefined;

    const where = id ? { fonnteId: id } : stateId ? { stateId } : null;
    if (!where) return { updated: 0 };

    const normalized = this.normalizeStatus(payload.status, payload.state);

    const res = await prisma.whatsappDelivery.updateMany({
      where,
      data: {
        ...(stateId ? { stateId } : {}),
        ...(payload.status !== undefined ? { fonnteStatus: String(payload.status) } : {}),
        ...(payload.state !== undefined ? { fonnteState: String(payload.state) } : {}),
        ...(normalized ? { status: normalized } : {}),
      },
    });
    return { updated: res.count };
  }

  async listByBatch(batchId: string) {
    return prisma.whatsappDelivery.findMany({
      where: { batchId },
      orderBy: [{ unitNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Ringkasan jumlah per status untuk satu batch. */
  async summaryByBatch(batchId: string): Promise<Record<string, number>> {
    const rows = await prisma.whatsappDelivery.groupBy({
      by: ['status'],
      where: { batchId },
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = r._count._all;
    return out;
  }

  async listRecent(source: string | undefined, limit = 100) {
    return prisma.whatsappDelivery.findMany({
      where: source ? { source } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}

export const whatsappDeliveryService = new WhatsappDeliveryService();
