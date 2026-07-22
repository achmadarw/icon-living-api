/**
 * Pengatur jeda (throttle) antar pengiriman WhatsApp.
 *
 * Karena tiap pesan dipersonalisasi, kita mengirim satu request per nomor.
 * Untuk menghindari nomor Fonnte diblokir, sisipkan jeda ACAK dalam rentang
 * di antara tiap pengiriman (bukan sebelum yang pertama / sesudah yang terakhir).
 *
 * Prioritas nilai (dari yang tertinggi):
 *   1. override argumen (mis. per broadcast dari UI)
 *   2. env WA_SEND_DELAY_MIN_MS / WA_SEND_DELAY_MAX_MS
 *   3. env WA_SEND_DELAY_MS (dipakai untuk min & max sekaligus = jeda tetap)
 *   4. default bawaan (3–8 detik)
 */

const DEFAULT_MIN_MS = 3000;
const DEFAULT_MAX_MS = 8000;

// Batas atas pengaman agar tidak salah set jeda ekstrem (mis. jam-an).
const MAX_ALLOWED_MS = 120_000;

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envInt(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(n, MAX_ALLOWED_MS);
}

function clamp(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_ALLOWED_MS);
}

export interface DelayRange {
  minMs: number;
  maxMs: number;
}

/** Tentukan rentang jeda efektif dari override + env + default. */
export function resolveDelayRange(override?: { minMs?: number | null; maxMs?: number | null }): DelayRange {
  const envSingle = envInt('WA_SEND_DELAY_MS');

  let minMs =
    override?.minMs != null ? clamp(override.minMs) : envInt('WA_SEND_DELAY_MIN_MS') ?? envSingle ?? DEFAULT_MIN_MS;
  let maxMs =
    override?.maxMs != null ? clamp(override.maxMs) : envInt('WA_SEND_DELAY_MAX_MS') ?? envSingle ?? DEFAULT_MAX_MS;

  if (maxMs < minMs) maxMs = minMs;
  return { minMs, maxMs };
}

/** Ambil satu nilai jeda acak (ms) dalam rentang. */
export function nextDelayMs(range: DelayRange): number {
  if (range.maxMs <= range.minMs) return range.minMs;
  return Math.floor(range.minMs + Math.random() * (range.maxMs - range.minMs));
}
