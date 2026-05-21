import PDFDocument from 'pdfkit';
import type { IplMonthlyReport, IncomeReportData, ExpenseReportData } from './report.service';

// ─── Strategy Interface ─────────────────────────────────

interface ExportStrategy {
  contentType: string;
  fileExtension: string;
}

interface IplExportStrategy extends ExportStrategy {
  generate(data: IplMonthlyReport): Buffer | Promise<Buffer>;
}

interface IncomeExportStrategy extends ExportStrategy {
  generate(data: IncomeReportData): Buffer | Promise<Buffer>;
}

interface ExpenseExportStrategy extends ExportStrategy {
  generate(data: ExpenseReportData): Buffer | Promise<Buffer>;
}

// ─── CSV Helpers ────────────────────────────────────────

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): Buffer {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  return Buffer.from(lines.join('\n'), 'utf-8');
}

function formatCurrencyPlain(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDatePlain(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ─── PDF Helper ─────────────────────────────────────────

function generatePdfBuffer(
  buildFn: (doc: any) => void,
  options: { size?: string; margin?: number; layout?: 'portrait' | 'landscape' } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: options.size ?? 'A4',
      margin: options.margin ?? 40,
      layout: options.layout ?? 'portrait',
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildFn(doc);
    doc.end();
  });
}

// ─── IPL CSV Strategy ───────────────────────────────────

class IplCsvStrategy implements IplExportStrategy {
  contentType = 'text/csv; charset=utf-8';
  fileExtension = 'csv';

  generate(data: IplMonthlyReport): Buffer {
    const headers = ['No', 'Nama', 'Unit', 'Status'];
    const rows = data.residents.map((r, i) => [i + 1, r.name, r.unitNumber, r.status]);
    return buildCsv(headers, rows);
  }
}

// ─── IPL PDF Strategy ───────────────────────────────────

class IplPdfStrategy implements IplExportStrategy {
  contentType = 'application/pdf';
  fileExtension = 'pdf';

  async generate(data: IplMonthlyReport): Promise<Buffer> {
    return generatePdfBuffer((doc) => {
      doc.fontSize(16).text(`Laporan IPL — ${MONTHS_ID[data.month - 1]} ${data.year}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Jenis: ${data.paymentTypeName} | Nominal: Rp ${data.fixedAmount ? formatCurrencyPlain(data.fixedAmount) : '-'}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.text(`Lunas: ${data.summary.lunas} | Pending: ${data.summary.pending} | Belum: ${data.summary.belumBayar} | Total: ${data.summary.total}`, { align: 'center' });
      doc.moveDown(1);

      // Table header
      const startX = 40;
      const colWidths = [30, 180, 80, 80];
      let y = doc.y;

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('No', startX, y, { width: colWidths[0] });
      doc.text('Nama', startX + colWidths[0], y, { width: colWidths[1] });
      doc.text('Unit', startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text('Status', startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      y += 18;
      doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
      y += 5;

      doc.font('Helvetica').fontSize(9);
      for (let i = 0; i < data.residents.length; i++) {
        if (y > 760) { doc.addPage(); y = 40; }
        const r = data.residents[i];
        doc.text(String(i + 1), startX, y, { width: colWidths[0] });
        doc.text(r.name, startX + colWidths[0], y, { width: colWidths[1] });
        doc.text(r.unitNumber ?? '-', startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
        doc.text(r.status, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
        y += 16;
      }
    });
  }
}

// ─── Income CSV Strategy ────────────────────────────────

class IncomeCsvStrategy implements IncomeExportStrategy {
  contentType = 'text/csv; charset=utf-8';
  fileExtension = 'csv';

  generate(data: IncomeReportData): Buffer {
    const headers = ['No', 'Tanggal', 'Nama', 'Unit', 'Jenis', 'Periode', 'Nominal'];
    const rows = data.items.map((item, i) => [
      i + 1, formatDatePlain(item.date), item.userName, item.unitNumber,
      item.paymentTypeName, item.periods.join('; '), item.amount,
    ]);
    rows.push(['', '', '', '', '', 'TOTAL', data.summary.totalAmount]);
    return buildCsv(headers, rows);
  }
}

// ─── Income PDF Strategy ────────────────────────────────

class IncomePdfStrategy implements IncomeExportStrategy {
  contentType = 'application/pdf';
  fileExtension = 'pdf';

  async generate(data: IncomeReportData): Promise<Buffer> {
    return generatePdfBuffer((doc) => {
      const periodLabel = data.month ? `${MONTHS_ID[data.month - 1]} ${data.year}` : `Tahun ${data.year}`;
      doc.fontSize(16).text(`Laporan Pemasukan — ${periodLabel}`, { align: 'center' });
      if (data.paymentTypeFilter) { doc.moveDown(0.3); doc.fontSize(10).text(`Filter: ${data.paymentTypeFilter}`, { align: 'center' }); }
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Total: Rp ${formatCurrencyPlain(data.summary.totalAmount)} | Transaksi: ${data.summary.totalTransactions}`, { align: 'center' });
      doc.moveDown(1);

      const startX = 40;
      const cols = [25, 65, 120, 55, 65, 75, 80];
      let y = doc.y;
      const hdrs = ['No', 'Tanggal', 'Nama', 'Unit', 'Jenis', 'Periode', 'Nominal'];

      doc.fontSize(8).font('Helvetica-Bold');
      let cx = startX;
      for (let i = 0; i < hdrs.length; i++) { doc.text(hdrs[i], cx, y, { width: cols[i] }); cx += cols[i]; }
      y += 16;
      doc.moveTo(startX, y).lineTo(startX + cols.reduce((a, b) => a + b, 0), y).stroke();
      y += 4;

      doc.font('Helvetica').fontSize(8);
      for (let i = 0; i < data.items.length; i++) {
        if (y > 760) { doc.addPage(); y = 40; }
        const item = data.items[i];
        cx = startX;
        const vals = [String(i + 1), formatDatePlain(item.date), item.userName, item.unitNumber ?? '-', item.paymentTypeName, item.periods.join(', '), `Rp ${formatCurrencyPlain(item.amount)}`];
        for (let j = 0; j < vals.length; j++) { doc.text(vals[j], cx, y, { width: cols[j] }); cx += cols[j]; }
        y += 14;
      }

      y += 8;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`Total Pemasukan: Rp ${formatCurrencyPlain(data.summary.totalAmount)}`, startX, y);
    });
  }
}

// ─── Expense CSV Strategy ───────────────────────────────

class ExpenseCsvStrategy implements ExpenseExportStrategy {
  contentType = 'text/csv; charset=utf-8';
  fileExtension = 'csv';

  generate(data: ExpenseReportData): Buffer {
    const headers = ['No', 'Tanggal', 'Pengaju', 'Kategori', 'Metode Bayar', 'Penerima', 'No Bukti/Ref', 'Deskripsi', 'Nominal', 'Auto-Approve'];
    const rows = data.items.map((item, i) => [
      i + 1, formatDatePlain(item.expenseDate ?? item.date), item.requesterName, item.categoryName,
      item.paymentMethod ?? '-', item.recipient ?? '-', item.referenceNumber ?? '-',
      item.description, item.amount, item.isAutoApproved ? 'Ya' : 'Tidak',
    ]);
    rows.push(['', '', '', '', '', '', '', 'TOTAL', data.summary.totalAmount, '']);
    return buildCsv(headers, rows);
  }
}

// ─── Expense PDF Strategy ───────────────────────────────

class ExpensePdfStrategy implements ExpenseExportStrategy {
  contentType = 'application/pdf';
  fileExtension = 'pdf';

  async generate(data: ExpenseReportData): Promise<Buffer> {
    return generatePdfBuffer((doc) => {
      const periodLabel = data.month ? `${MONTHS_ID[data.month - 1]} ${data.year}` : `Tahun ${data.year}`;
      doc.fontSize(16).text(`Laporan Pengeluaran - ${periodLabel}`, { align: 'center' });
      if (data.categoryFilter) { doc.moveDown(0.3); doc.fontSize(10).text(`Filter: ${data.categoryFilter}`, { align: 'center' }); }
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Total: Rp ${formatCurrencyPlain(data.summary.totalAmount)} | Auto: ${data.summary.autoApprovedCount} | Manual: ${data.summary.manualApprovedCount}`, { align: 'center' });
      doc.moveDown(1);

      const startX = doc.page.margins.left;
      const cols = [24, 64, 92, 72, 78, 86, 90, 190, 74, 44];
      let y = doc.y;
      const hdrs = ['No', 'Tgl', 'Pengaju', 'Kategori', 'Metode', 'Penerima', 'No Ref', 'Deskripsi', 'Nominal', 'Auto'];
      const tableWidth = cols.reduce((a, b) => a + b, 0);
      const cellPaddingX = 3;
      const cellPaddingY = 3;
      const lineGap = 1;

      const drawHeader = () => {
        doc.fontSize(8).font('Helvetica-Bold');
        let hx = startX;
        for (let i = 0; i < hdrs.length; i++) {
          doc.text(hdrs[i], hx + cellPaddingX, y, { width: cols[i] - cellPaddingX * 2, lineBreak: false });
          hx += cols[i];
        }
        y += 14;
        doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
        y += 4;
        doc.font('Helvetica').fontSize(8);
      };

      drawHeader();

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const vals = [
          String(i + 1),
          formatDatePlain(item.expenseDate ?? item.date),
          truncateText(item.requesterName, 36),
          truncateText(item.categoryName, 24),
          truncateText(item.paymentMethod ?? '-', 24),
          truncateText(item.recipient ?? '-', 26),
          truncateText(item.referenceNumber ?? '-', 28),
          item.description.replace(/\s+/g, ' ').trim(),
          `Rp ${formatCurrencyPlain(item.amount)}`,
          item.isAutoApproved ? 'Ya' : '-',
        ];

        const textHeights = vals.map((value, colIndex) => {
          const textWidth = cols[colIndex] - cellPaddingX * 2;
          if (colIndex === 7) {
            const rawHeight = doc.heightOfString(value, { width: textWidth, lineGap });
            return Math.min(rawHeight, 9 * 3);
          }
          return 9;
        });
        const rowHeight = Math.max(...textHeights) + cellPaddingY * 2;

        if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
          y = doc.page.margins.top;
          drawHeader();
        }

        let cx = startX;
        for (let j = 0; j < vals.length; j++) {
          const textWidth = cols[j] - cellPaddingX * 2;
          const options = j === 7
            ? { width: textWidth, height: rowHeight - cellPaddingY * 2, ellipsis: true, lineGap }
            : { width: textWidth, lineBreak: false };
          doc.text(vals[j], cx + cellPaddingX, y + cellPaddingY, options as any);
          cx += cols[j];
        }

        y += rowHeight;
      }

      y += 8;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text(`Total Pengeluaran: Rp ${formatCurrencyPlain(data.summary.totalAmount)}`, startX, y);
    }, { layout: 'landscape', margin: 28, size: 'A4' });
  }
}
// ─── Export Service Facade ───────────────────────────────

export class ExportService {
  getIplStrategy(format: string): IplExportStrategy {
    return format === 'csv' ? new IplCsvStrategy() : new IplPdfStrategy();
  }

  getIncomeStrategy(format: string): IncomeExportStrategy {
    return format === 'csv' ? new IncomeCsvStrategy() : new IncomePdfStrategy();
  }

  getExpenseStrategy(format: string): ExpenseExportStrategy {
    return format === 'csv' ? new ExpenseCsvStrategy() : new ExpensePdfStrategy();
  }
}

export const exportService = new ExportService();

// Re-export for testing
export { IplCsvStrategy, IplPdfStrategy, IncomeCsvStrategy, IncomePdfStrategy, ExpenseCsvStrategy, ExpensePdfStrategy, buildCsv, escapeCsv };

