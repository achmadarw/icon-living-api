import { prisma } from '../lib/prisma';
import { NotFoundError, AppError } from '../utils/errors';
import type { CreateExpenseCategoryInput, UpdateExpenseCategoryInput } from '@tia/shared';

export class ExpenseCategoryService {
  async create(input: CreateExpenseCategoryInput) {
    return prisma.expenseCategory.create({
      data: {
        name: input.name,
        description: input.description,
        requiresApproval: input.requiresApproval ?? true,
        isActive: input.isActive ?? true,
      },
    });
  }

  async findAll() {
    return prisma.expenseCategory.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const cat = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!cat) {
      throw new NotFoundError('Kategori pengeluaran');
    }
    return cat;
  }

  async update(id: string, input: UpdateExpenseCategoryInput) {
    await this.findById(id);
    return prisma.expenseCategory.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    const count = await prisma.expense.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Kategori tidak bisa dihapus karena sudah memiliki pengeluaran terkait');
    }
    await prisma.expenseCategory.delete({ where: { id } });
  }
}

export const expenseCategoryService = new ExpenseCategoryService();
