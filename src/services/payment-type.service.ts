import { prisma } from '../lib/prisma';
import { NotFoundError, AppError } from '../utils/errors';
import type { CreatePaymentTypeInput, UpdatePaymentTypeInput } from '@tia/shared';

export class PaymentTypeService {
  async create(input: CreatePaymentTypeInput) {
    return prisma.paymentType.create({
      data: {
        name: input.name,
        description: input.description,
        fixedAmount: input.fixedAmount,
        isMandatory: input.isMandatory ?? false,
        isActive: input.isActive ?? true,
      },
    });
  }

  async findAll() {
    return prisma.paymentType.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const pt = await prisma.paymentType.findUnique({ where: { id } });
    if (!pt) {
      throw new NotFoundError('Jenis pembayaran');
    }
    return pt;
  }

  async update(id: string, input: UpdatePaymentTypeInput) {
    await this.findById(id);
    return prisma.paymentType.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    const paymentCount = await prisma.payment.count({ where: { paymentTypeId: id } });
    if (paymentCount > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Jenis pembayaran tidak bisa dihapus karena sudah memiliki pembayaran terkait');
    }
    await prisma.paymentType.delete({ where: { id } });
  }
}

export const paymentTypeService = new PaymentTypeService();
