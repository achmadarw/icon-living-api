import { prisma } from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * Pembacaan & pembersihan roster.
 *
 * Pembentukan roster dilakukan SEPENUHNYA oleh Auto Assign
 * (`roster-auto-assign.service.ts`), mengikuti alur TIA saat ini: pola dibuat
 * otomatis oleh algoritma, bukan dipilih manual dari pustaka.
 *
 * Konvensi tanggal: semua disimpan sebagai string "YYYY-MM-DD"
 * (bulan "YYYY-MM-01"), sehingga penyaringan per bulan cukup memakai awalan "YYYY-MM".
 */

/** Normalisasi "2026-08" / "2026-08-17" → "2026-08-01". */
export function normalizeMonth(input: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(input?.trim() ?? '');
  if (!match) {
    throw new ValidationError('Format bulan harus YYYY-MM-DD atau YYYY-MM');
  }
  return `${match[1]}-${match[2]}-01`;
}

/** Awalan "YYYY-MM" untuk menyaring tanggal dalam satu bulan. */
function monthPrefix(month: string): string {
  return month.slice(0, 7);
}

export class RosterService {
  /** Pola yang berlaku bulan itu (hasil Auto Assign). Hanya untuk ditampilkan. */
  async listAssignments(monthInput: string) {
    const month = normalizeMonth(monthInput);

    return prisma.rosterAssignment.findMany({
      where: { assignmentMonth: month },
      include: {
        personnel: { select: { id: true, name: true, isActive: true } },
        pattern: { select: { id: true, name: true, patternData: true } },
      },
      orderBy: { personnel: { name: 'asc' } },
    });
  }

  /**
   * Koreksi manual satu hari untuk satu personel — port dari
   * `POST /api/shift-assignments/update` milik TIA.
   *
   * `shiftId === null` berarti dijadikan OFF: barisnya dihapus DAN dicatat sebagai
   * override. Pencatatan itu penting supaya kalender tidak menyimpulkan hari
   * tersebut sekadar "belum digenerate".
   */
  async setDayOverride(
    input: { personnelId: string; date: string; shiftId: string | null },
    createdById?: string,
  ) {
    const { personnelId, date, shiftId } = input;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Format tanggal harus YYYY-MM-DD');
    }

    const personnel = await prisma.securityPersonnel.findUnique({
      where: { id: personnelId },
      select: { id: true, isActive: true },
    });
    if (!personnel) throw new NotFoundError('Personel keamanan');
    if (!personnel.isActive) {
      throw new ValidationError('Personel nonaktif tidak bisa dijadwalkan');
    }

    if (shiftId) {
      const shift = await prisma.securityShift.findFirst({
        where: { id: shiftId, isActive: true },
        select: { id: true },
      });
      if (!shift) throw new ValidationError('Shift tidak ditemukan atau tidak aktif');
    }

    return prisma.$transaction(async (tx) => {
      // Satu personel hanya boleh punya satu jadwal per hari.
      await tx.shiftAssignment.deleteMany({
        where: { personnelId, assignmentDate: date },
      });

      if (shiftId) {
        await tx.shiftAssignment.create({
          data: {
            personnelId,
            shiftId,
            assignmentDate: date,
            createdById: createdById ?? null,
          },
        });
      }

      await tx.rosterDayOverride.upsert({
        where: { personnelId_overrideDate: { personnelId, overrideDate: date } },
        create: {
          personnelId,
          overrideDate: date,
          shiftId: shiftId ?? null,
          createdById: createdById ?? null,
        },
        update: { shiftId: shiftId ?? null },
      });

      return { personnelId, date, shiftId: shiftId ?? null };
    });
  }

  /** Batalkan koreksi manual satu hari, kembalikan sel ke hasil generate. */
  async clearDayOverride(personnelId: string, date: string) {
    await prisma.rosterDayOverride.deleteMany({
      where: { personnelId, overrideDate: date },
    });
    return { personnelId, date };
  }

  /** Kosongkan seluruh roster satu bulan (assignment + jadwal + override). */
  async clearMonth(monthInput: string) {
    const month = normalizeMonth(monthInput);
    const prefix = monthPrefix(month);

    return prisma.$transaction(async (tx) => {
      const shifts = await tx.shiftAssignment.deleteMany({
        where: { assignmentDate: { startsWith: prefix } },
      });
      const overrides = await tx.rosterDayOverride.deleteMany({
        where: { overrideDate: { startsWith: prefix } },
      });
      const assignments = await tx.rosterAssignment.deleteMany({
        where: { assignmentMonth: month },
      });

      return {
        month,
        deletedAssignments: assignments.count,
        deletedShifts: shifts.count,
        deletedOverrides: overrides.count,
      };
    });
  }

  /**
   * Jadwal satu bulan untuk kalender.
   *
   * Hari OFF tidak tersimpan sebagai baris — kalender menyimpulkannya dari
   * ketiadaan data, sama seperti TIA. Override manual bertipe OFF ikut disertakan
   * sebagai baris semu agar tetap terlihat.
   */
  async getMonthSchedule(monthInput: string, personnelId?: string) {
    const month = normalizeMonth(monthInput);
    const prefix = monthPrefix(month);

    const [shiftAssignments, overrides] = await Promise.all([
      prisma.shiftAssignment.findMany({
        where: {
          assignmentDate: { startsWith: prefix },
          ...(personnelId ? { personnelId } : {}),
        },
        include: {
          personnel: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true, code: true, color: true } },
        },
        orderBy: [{ assignmentDate: 'asc' }, { personnelId: 'asc' }],
      }),
      prisma.rosterDayOverride.findMany({
        where: {
          overrideDate: { startsWith: prefix },
          ...(personnelId ? { personnelId } : {}),
        },
        include: { personnel: { select: { id: true, name: true } } },
      }),
    ]);

    // Sel yang pernah dikoreksi manual, agar bisa ditandai di kalender.
    const manualKeys = new Set(
      overrides.map((row) => `${row.personnelId}|${row.overrideDate}`),
    );

    return {
      month,
      items: [
        ...shiftAssignments.map((row) => ({
          id: row.id,
          personnelId: row.personnelId,
          personnelName: row.personnel.name,
          date: row.assignmentDate,
          shiftId: row.shift.id,
          shiftName: row.shift.name,
          shiftCode: row.shift.code,
          shiftColor: row.shift.color,
          isReplacement: row.isReplacement,
          isOverrideOff: false,
          isManual: manualKeys.has(`${row.personnelId}|${row.assignmentDate}`),
        })),
        // OFF hasil koreksi manual: tidak punya baris jadwal, jadi dibuat baris semu
        // supaya kalender tahu ini OFF yang disengaja, bukan sekadar belum digenerate.
        ...overrides
          .filter((row) => row.shiftId === null)
          .map((row) => ({
            id: row.id,
            personnelId: row.personnelId,
            personnelName: row.personnel.name,
            date: row.overrideDate,
            shiftId: null,
            shiftName: 'OFF',
            shiftCode: 'OFF',
            shiftColor: '#ef4444',
            isReplacement: false,
            isOverrideOff: true,
            isManual: true,
          })),
      ],
    };
  }
}

export const rosterService = new RosterService();
