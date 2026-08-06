import path from 'path';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { normalizeMonth } from './roster.service';
import { daysInMonth, formatDateString } from './roster-engine.service';
import { generateRosterPDFHTML } from '../templates/roster-pdf.template';

/**
 * Export roster bulanan ke PDF.
 *
 * Template HTML-nya diport apa adanya dari TIA agar hasilnya identik, lalu
 * dirender memakai Puppeteer (sesuai keputusan pada dokumen analisis).
 *
 * Puppeteer di-`import` secara dinamis supaya server tetap bisa jalan di
 * lingkungan yang belum memasang Chromium — kegagalan hanya terjadi saat
 * tombol export ditekan, bukan saat aplikasi dinyalakan.
 */

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Nama hari singkat ala TIA (Sun..Sat). */
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class RosterPdfService {
  /** Rakit data untuk template, mengikuti bentuk yang diharapkan TIA. */
  private async buildTemplateData(monthInput: string) {
    const month = normalizeMonth(monthInput);
    const prefix = month.slice(0, 7);
    const year = Number(month.slice(0, 4));
    const monthNum = Number(month.slice(5, 7));
    const totalDays = daysInMonth(year, monthNum);

    const [personnel, shifts, assignments, overrides] = await Promise.all([
      prisma.securityPersonnel.findMany({
        where: { isActive: true },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.securityShift.findMany({
        where: { isActive: true },
        select: { code: true, name: true, color: true, startTime: true, endTime: true },
        orderBy: { code: 'asc' },
      }),
      prisma.shiftAssignment.findMany({
        where: { assignmentDate: { startsWith: prefix } },
        select: { personnelId: true, assignmentDate: true, shift: { select: { code: true } } },
      }),
      prisma.rosterDayOverride.findMany({
        where: { overrideDate: { startsWith: prefix } },
        select: { personnelId: true, overrideDate: true },
      }),
    ]);

    if (personnel.length === 0) {
      throw new ValidationError('Belum ada personel aktif untuk diekspor.');
    }

    const scheduleByKey = new Map<string, string>();
    for (const row of assignments) {
      scheduleByKey.set(`${row.personnelId}|${row.assignmentDate}`, row.shift.code);
    }

    const hasAnySchedule = assignments.length > 0 || overrides.length > 0;
    if (!hasAnySchedule) {
      throw new ValidationError('Belum ada jadwal pada bulan ini. Jalankan Auto Assign dulu.');
    }

    /**
     * Urutan baris mengikuti tampilan kalender: menaik berdasarkan tanggal
     * libur pertama, sama seperti mode "First OFF" di layar.
     */
    const rows = personnel
      .slice()
      .reverse()
      .map((person, index) => {
        const shiftsPerDay = [];
        let firstOffDay = 999;

        for (let day = 1; day <= totalDays; day++) {
          const date = formatDateString(year, monthNum, day);
          const code = scheduleByKey.get(`${person.id}|${date}`);
          if (!code && firstOffDay === 999) firstOffDay = day;
          // Hari tanpa jadwal berarti libur — template TIA menandainya dengan 'O'.
          shiftsPerDay.push({ shiftCode: code ?? 'O', isOff: !code });
        }

        return { name: person.name, shifts: shiftsPerDay, firstOffDay, index };
      })
      .sort((a, b) => a.firstOffDay - b.firstOffDay || a.index - b.index)
      .map(({ name, shifts: shiftsPerDay }) => ({ name, shifts: shiftsPerDay }));

    const dayNames = Array.from({ length: totalDays }, (_, i) => {
      const weekday = new Date(year, monthNum - 1, i + 1).getDay();
      return DAY_NAMES_EN[weekday];
    });

    // Template TIA membaca `start_time`/`end_time` (gaya SQL), jadi dipetakan.
    const shiftsForTemplate = shifts.map((shift) => ({
      code: shift.code,
      name: shift.name,
      color: shift.color ?? '#6B7280',
      start_time: shift.startTime,
      end_time: shift.endTime,
      is_active: true,
    }));

    return {
      month: `${MONTH_NAMES_EN[monthNum - 1]} ${year}`,
      daysInMonth: totalDays,
      dayNames,
      users: rows,
      shifts: shiftsForTemplate,
      template: shifts.length <= 2 ? '5p-2s' : '5p-3s',
      shiftTimes: Object.fromEntries(
        shifts.map((shift) => [shift.code, { start: shift.startTime, end: shift.endTime }]),
      ),
      logoDir: path.join(process.cwd(), 'assets', 'logos'),
      monthKey: month,
    };
  }

  async generate(monthInput: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.buildTemplateData(monthInput);
    const html = generateRosterPDFHTML(data);

    // Nama modul disimpan di variabel agar TypeScript tidak me-resolve-nya saat
    // kompilasi: Puppeteer bersifat opsional, sehingga API tetap bisa dibangun
    // dan dijalankan di lingkungan yang belum memasang Chromium.
    const puppeteerModule = 'puppeteer';
    let puppeteer: any;

    try {
      puppeteer = await import(puppeteerModule);
    } catch {
      throw new ValidationError(
        'Puppeteer belum terpasang di server, sehingga export PDF tidak bisa dijalankan.',
      );
    }

    let browser: any = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const buffer = Buffer.from(
        await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
        }),
      );

      logger.info('[roster] PDF dibuat', { month: data.monthKey, bytes: buffer.length });

      return { buffer, filename: `Roster-${data.month.replace(' ', '-')}.pdf` };
    } finally {
      // Wajib ditutup agar proses Chromium tidak menumpuk di server.
      await browser?.close();
    }
  }
}

export const rosterPdfService = new RosterPdfService();
