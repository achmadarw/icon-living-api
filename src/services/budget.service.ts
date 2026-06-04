import { prisma } from '../lib/prisma';
import { cyclesPerYear, type CreateBudgetInput, type UpdateBudgetInput, type BudgetFrequency } from '@tia/shared';

export interface BudgetResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  year: number;
  amountPerCycle: number;
  frequency: BudgetFrequency;
  annualAmount: number;
  monthlyEquivalent: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetVsActualRow {
  categoryId: string;
  categoryName: string;
  amountPerCycle: number;
  frequency: BudgetFrequency;
  monthlyEquivalent: number;
  annualAmount: number;
  ytdBudget: number;
  ytdActual: number;
  selisih: number;
  serapanPct: number;
  status: 'AMAN' | 'OVER';
}

export interface BudgetVsActualReport {
  year: number;
  month: number;
  rows: BudgetVsActualRow[];
  totals: {
    monthlyEquivalent: number;
    annualAmount: number;
    ytdBudget: number;
    ytdActual: number;
    selisih: number;
    serapanPct: number;
    status: 'AMAN' | 'OVER';
  };
}

function toBudgetResponse(b: {
  id: string;
  categoryId: string;
  year: number;
  amountPerCycle: { toNumber: () => number };
  frequency: BudgetFrequency;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string };
}): BudgetResponse {
  const amount = b.amountPerCycle.toNumber();
  const annual = amount * cyclesPerYear[b.frequency];
  return {
    id: b.id,
    categoryId: b.categoryId,
    categoryName: b.category.name,
    year: b.year,
    amountPerCycle: amount,
    frequency: b.frequency,
    annualAmount: annual,
    monthlyEquivalent: annual / 12,
    note: b.note,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export class BudgetService {
  async list(year?: number, categoryId?: string): Promise<BudgetResponse[]> {
    const where: Record<string, unknown> = {};
    if (year) where.year = year;
    if (categoryId) where.categoryId = categoryId;
    const items = await prisma.categoryBudget.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [{ year: 'desc' }, { category: { name: 'asc' } }],
    });
    return items.map(toBudgetResponse);
  }

  async create(input: CreateBudgetInput): Promise<BudgetResponse> {
    const created = await prisma.categoryBudget.create({
      data: {
        categoryId: input.categoryId,
        year: input.year,
        amountPerCycle: input.amountPerCycle,
        frequency: input.frequency,
        note: input.note ?? null,
      },
      include: { category: { select: { name: true } } },
    });
    return toBudgetResponse(created);
  }

  async update(id: string, input: UpdateBudgetInput): Promise<BudgetResponse> {
    const updated = await prisma.categoryBudget.update({
      where: { id },
      data: {
        ...(input.amountPerCycle !== undefined ? { amountPerCycle: input.amountPerCycle } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
      include: { category: { select: { name: true } } },
    });
    return toBudgetResponse(updated);
  }

  async remove(id: string): Promise<void> {
    await prisma.categoryBudget.delete({ where: { id } });
  }

  /**
   * Laporan Anggaran vs Realisasi YTD.
   * Anggaran YTD diproyeksikan secara linear: annualAmount * (month / 12).
   * Realisasi YTD = jumlah Expense yg sudah punya transactionId
   * (artinya sudah masuk ledger) dari Jan sampai akhir bulan tersebut.
   */
  async budgetVsActual(year: number, monthInput?: number): Promise<BudgetVsActualReport> {
    const now = new Date();
    const month =
      monthInput ?? (now.getFullYear() === year ? now.getMonth() + 1 : 12);

    const [budgets, expenseAgg] = await prisma.$transaction([
      prisma.categoryBudget.findMany({
        where: { year },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { category: { name: 'asc' } },
      }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          transactionId: { not: null },
          expenseDate: {
            gte: new Date(year, 0, 1),
            lt: new Date(year, month, 1),
          },
        },
        _sum: { amount: true },
        orderBy: { categoryId: 'asc' },
      }),
    ]);

    const actualByCategory = new Map<string, number>();
    for (const row of expenseAgg) {
      actualByCategory.set(row.categoryId, row._sum?.amount?.toNumber() ?? 0);
    }

    const rows: BudgetVsActualRow[] = budgets.map((b) => {
      const amount = b.amountPerCycle.toNumber();
      const annual = amount * cyclesPerYear[b.frequency];
      const monthlyEq = annual / 12;
      const ytdBudget = monthlyEq * month;
      const ytdActual = actualByCategory.get(b.categoryId) ?? 0;
      const selisih = ytdBudget - ytdActual;
      const serapanPct = ytdBudget === 0 ? 0 : (ytdActual / ytdBudget) * 100;
      return {
        categoryId: b.categoryId,
        categoryName: b.category.name,
        amountPerCycle: amount,
        frequency: b.frequency,
        monthlyEquivalent: monthlyEq,
        annualAmount: annual,
        ytdBudget,
        ytdActual,
        selisih,
        serapanPct,
        status: serapanPct > 100 ? 'OVER' : 'AMAN',
      };
    });

    const totalMonthly = rows.reduce((s, r) => s + r.monthlyEquivalent, 0);
    const totalAnnual = rows.reduce((s, r) => s + r.annualAmount, 0);
    const totalYtdBudget = rows.reduce((s, r) => s + r.ytdBudget, 0);
    const totalYtdActual = rows.reduce((s, r) => s + r.ytdActual, 0);
    const totalSelisih = totalYtdBudget - totalYtdActual;
    const totalSerapan = totalYtdBudget === 0 ? 0 : (totalYtdActual / totalYtdBudget) * 100;

    return {
      year,
      month,
      rows,
      totals: {
        monthlyEquivalent: totalMonthly,
        annualAmount: totalAnnual,
        ytdBudget: totalYtdBudget,
        ytdActual: totalYtdActual,
        selisih: totalSelisih,
        serapanPct: totalSerapan,
        status: totalSerapan > 100 ? 'OVER' : 'AMAN',
      },
    };
  }
}

export const budgetService = new BudgetService();
