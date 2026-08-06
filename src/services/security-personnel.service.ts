import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError, DuplicateError } from '../utils/errors';

export interface CreatePersonnelInput {
  name: string;
  phone?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export type UpdatePersonnelInput = Partial<CreatePersonnelInput>;

export interface CreateShiftInput {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  color?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateShiftInput = Partial<CreateShiftInput>;

export class SecurityPersonnelService {
  // ─── Personel ─────────────────────────────────────────

  /**
   * Daftar personel. Urutan `createdAt desc` MENENTUKAN urutan baris pola saat
   * Auto Assign — sama seperti TIA (`ORDER BY created_at DESC`). Jangan diubah.
   */
  async listPersonnel(onlyActive = false) {
    return prisma.securityPersonnel.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPersonnel(id: string) {
    const personnel = await prisma.securityPersonnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundError('Personel keamanan');
    return personnel;
  }

  async createPersonnel(input: CreatePersonnelInput) {
    const name = input.name.trim();
    if (!name) throw new ValidationError('Nama personel wajib diisi');

    return prisma.securityPersonnel.create({
      data: {
        name,
        phone: input.phone?.trim() || null,
        note: input.note?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updatePersonnel(id: string, input: UpdatePersonnelInput) {
    await this.findPersonnel(id);

    return prisma.securityPersonnel.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  /**
   * Hapus personel. Ditolak bila sudah pernah dipakai di roster agar riwayat
   * jadwal tidak ikut terhapus (relasi cascade). Nonaktifkan saja sebagai gantinya.
   */
  async deletePersonnel(id: string) {
    await this.findPersonnel(id);

    const [assignmentCount, shiftCount] = await Promise.all([
      prisma.rosterAssignment.count({ where: { personnelId: id } }),
      prisma.shiftAssignment.count({ where: { personnelId: id } }),
    ]);

    if (assignmentCount > 0 || shiftCount > 0) {
      throw new ValidationError(
        'Personel sudah memiliki riwayat roster sehingga tidak bisa dihapus. Nonaktifkan personel ini saja.',
      );
    }

    await prisma.securityPersonnel.delete({ where: { id } });
    return { id };
  }

  // ─── Shift ────────────────────────────────────────────

  async listShifts(onlyActive = false) {
    return prisma.securityShift.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { code: 'asc' },
    });
  }

  async findShift(id: string) {
    const shift = await prisma.securityShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundError('Shift');
    return shift;
  }

  async createShift(input: CreateShiftInput) {
    const code = input.code.trim();
    const existing = await prisma.securityShift.findUnique({ where: { code } });
    if (existing) throw new DuplicateError('Kode shift');

    return prisma.securityShift.create({
      data: {
        name: input.name.trim(),
        code,
        startTime: input.startTime.trim(),
        endTime: input.endTime.trim(),
        color: input.color?.trim() || null,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateShift(id: string, input: UpdateShiftInput) {
    await this.findShift(id);

    if (input.code !== undefined) {
      const code = input.code.trim();
      const duplicate = await prisma.securityShift.findFirst({
        where: { code, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) throw new DuplicateError('Kode shift');
    }

    return prisma.securityShift.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code.trim() } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime.trim() } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime.trim() } : {}),
        ...(input.color !== undefined ? { color: input.color?.trim() || null } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async deleteShift(id: string) {
    await this.findShift(id);

    const usageCount = await prisma.shiftAssignment.count({ where: { shiftId: id } });
    if (usageCount > 0) {
      throw new ValidationError(
        'Shift sudah dipakai pada jadwal roster sehingga tidak bisa dihapus. Nonaktifkan shift ini saja.',
      );
    }

    await prisma.securityShift.delete({ where: { id } });
    return { id };
  }
}

export const securityPersonnelService = new SecurityPersonnelService();
