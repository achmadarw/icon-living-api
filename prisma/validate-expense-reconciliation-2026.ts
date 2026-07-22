import path from 'node:path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MONTH_ORDER = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
];

function asText(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const filePath = fileArg
    ? path.resolve(fileArg.split('=').slice(1).join('='))
    : 'C:/Users/HYPE AMD/Downloads/Laporan Keuangan 2026.xlsx';

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets['Pengeluaran Detail 2026'];
  if (!ws) throw new Error('Sheet "Pengeluaran Detail 2026" tidak ditemukan');

  const rows = XLSX.utils.sheet_to_json<Array<unknown>>(ws, { header: 1, defval: '' });

  const excelTotals = new Map<string, number>();
  for (const row of rows) {
    const col0 = asText(row[0]).toUpperCase();
    if (!col0.startsWith('TOTAL PENGELUARAN')) continue;
    const month = col0.replace('TOTAL PENGELUARAN', '').trim().toUpperCase();
    const amount = toNumber(row[8]);
    if (month) excelTotals.set(month, amount);
  }

  const tx = await prisma.transaction.findMany({
    where: {
      type: 'EXPENSE',
      createdAt: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
        lt: new Date('2027-01-01T00:00:00.000Z'),
      },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  const dbTotals = new Map<string, number>();
  for (const t of tx) {
    const monthIdx = t.createdAt.getUTCMonth();
    const month = MONTH_ORDER[monthIdx];
    dbTotals.set(month, (dbTotals.get(month) ?? 0) + t.amount.toNumber());
  }

  console.log('=== REKONSILIASI PENGELUARAN 2026 ===');
  console.log('Month'.padEnd(12), 'Excel'.padStart(14), 'DB'.padStart(14), 'Selisih'.padStart(14), 'Status');

  let totalExcel = 0;
  let totalDb = 0;
  let mismatch = 0;

  for (const month of MONTH_ORDER) {
    const excel = Math.round((excelTotals.get(month) ?? 0) * 100) / 100;
    const db = Math.round((dbTotals.get(month) ?? 0) * 100) / 100;
    const diff = Math.round((db - excel) * 100) / 100;
    const ok = Math.abs(diff) < 0.5;
    if (!ok) mismatch += 1;
    totalExcel += excel;
    totalDb += db;
    console.log(
      month.padEnd(12),
      excel.toLocaleString('id-ID').padStart(14),
      db.toLocaleString('id-ID').padStart(14),
      diff.toLocaleString('id-ID').padStart(14),
      ok ? 'MATCH' : 'MISMATCH',
    );
  }

  const grandDiff = Math.round((totalDb - totalExcel) * 100) / 100;
  console.log('---');
  console.log(
    'TOTAL'.padEnd(12),
    totalExcel.toLocaleString('id-ID').padStart(14),
    totalDb.toLocaleString('id-ID').padStart(14),
    grandDiff.toLocaleString('id-ID').padStart(14),
    Math.abs(grandDiff) < 0.5 ? 'MATCH' : 'MISMATCH',
  );
  console.log('Mismatch months:', mismatch);
}

main()
  .catch((error) => {
    console.error('Validation failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

