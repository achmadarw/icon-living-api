import { describe, it, expect } from 'vitest';
import {
  ExportService,
  IplCsvStrategy,
  IncomeCsvStrategy,
  ExpenseCsvStrategy,
  buildCsv,
  escapeCsv,
} from '../services/export.service';
import type { IplMonthlyReport, IncomeReportData, ExpenseReportData } from '../services/report.service';

// ─── Mock Data ──────────────────────────────────────────

const mockIplReport: IplMonthlyReport = {
  month: 1, year: 2026, period: '2026-01',
  paymentTypeName: 'IPL', fixedAmount: 250000,
  residents: [
    { userId: 'u1', name: 'User A', unitNumber: 'A-01', status: 'LUNAS', paymentId: 'p1' },
    { userId: 'u2', name: 'User B', unitNumber: 'A-02', status: 'PENDING', paymentId: 'p2' },
    { userId: 'u3', name: 'User "C"', unitNumber: 'B-01', status: 'BELUM' },
  ],
  summary: { total: 3, lunas: 1, pending: 1, belumBayar: 1 },
};

const mockIncomeReport: IncomeReportData = {
  year: 2026, month: 1, period: '2026-01',
  items: [{
    id: 'pay-1', date: new Date('2026-01-15'), userName: 'Budi',
    unitNumber: 'A-01', paymentTypeName: 'IPL', periods: ['2026-01'],
    amount: 250000, status: 'APPROVED',
  }],
  summary: { totalAmount: 250000, totalTransactions: 1 },
};

const mockExpenseReport: ExpenseReportData = {
  year: 2026, month: 1, period: '2026-01',
  items: [{
    id: 'exp-1', date: new Date('2026-01-20'), requesterName: 'Bu Bendahara',
    categoryName: 'Gaji Satpam', description: 'Gaji Januari',
    amount: 500000, status: 'APPROVED', isAutoApproved: true,
  }],
  summary: { totalAmount: 500000, totalExpenses: 1, autoApprovedCount: 1, manualApprovedCount: 0 },
};

// ─── Tests ──────────────────────────────────────────────

describe('Export Utilities', () => {
  describe('escapeCsv', () => {
    it('should return plain string as-is', () => {
      expect(escapeCsv('hello')).toBe('hello');
    });

    it('should wrap strings with commas in quotes', () => {
      expect(escapeCsv('hello, world')).toBe('"hello, world"');
    });

    it('should escape double quotes', () => {
      expect(escapeCsv('User "C"')).toBe('"User ""C"""');
    });

    it('should handle null/undefined', () => {
      expect(escapeCsv(null)).toBe('');
      expect(escapeCsv(undefined)).toBe('');
    });

    it('should handle numbers', () => {
      expect(escapeCsv(250000)).toBe('250000');
    });
  });

  describe('buildCsv', () => {
    it('should create valid CSV with headers and rows', () => {
      const result = buildCsv(['A', 'B'], [['1', '2'], ['3', '4']]);
      const text = result.toString();
      expect(text).toBe('A,B\n1,2\n3,4');
    });
  });
});

describe('ExportService', () => {
  const service = new ExportService();

  describe('strategy selection', () => {
    it('should return CSV strategy for csv format', () => {
      const strategy = service.getIplStrategy('csv');
      expect(strategy.contentType).toContain('csv');
      expect(strategy.fileExtension).toBe('csv');
    });

    it('should return PDF strategy for pdf format', () => {
      const strategy = service.getIplStrategy('pdf');
      expect(strategy.contentType).toBe('application/pdf');
      expect(strategy.fileExtension).toBe('pdf');
    });

    it('should default to PDF for unknown format', () => {
      const strategy = service.getIplStrategy('unknown');
      expect(strategy.contentType).toBe('application/pdf');
    });
  });
});

describe('CSV Strategies', () => {
  describe('IplCsvStrategy', () => {
    it('should generate valid CSV for IPL report', () => {
      const strategy = new IplCsvStrategy();
      const buffer = strategy.generate(mockIplReport);
      const text = buffer.toString();

      expect(text).toContain('No,Nama,Unit,Status');
      expect(text).toContain('User A');
      expect(text).toContain('LUNAS');
      expect(text).toContain('PENDING');
      expect(text).toContain('BELUM');
      // User "C" should be escaped
      expect(text).toContain('"User ""C"""');
    });
  });

  describe('IncomeCsvStrategy', () => {
    it('should generate valid CSV for income report', () => {
      const strategy = new IncomeCsvStrategy();
      const buffer = strategy.generate(mockIncomeReport);
      const text = buffer.toString();

      expect(text).toContain('No,Tanggal,Nama,Unit,Jenis,Periode,Nominal');
      expect(text).toContain('Budi');
      expect(text).toContain('IPL');
      expect(text).toContain('TOTAL');
      expect(text).toContain('250000');
    });
  });

  describe('ExpenseCsvStrategy', () => {
    it('should generate valid CSV for expense report', () => {
      const strategy = new ExpenseCsvStrategy();
      const buffer = strategy.generate(mockExpenseReport);
      const text = buffer.toString();

      expect(text).toContain('No,Tanggal,Pengaju,Kategori,Deskripsi,Nominal,Auto-Approve');
      expect(text).toContain('Bu Bendahara');
      expect(text).toContain('Gaji Satpam');
      expect(text).toContain('Ya');
      expect(text).toContain('TOTAL');
    });
  });
});
