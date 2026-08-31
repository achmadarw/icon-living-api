import { prisma } from '../lib/prisma';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { normalizeMonth } from './roster.service';
import {
  AUTO_ASSIGN_TEMPLATES,
  TWO_SHIFT_ROTATION_PATTERNS,
  REQUIRED_PERSONNEL_COUNT,
  AutoAssignError,
  createRowsFromDailyOffUserIndexes,
  createRowsFromOffDayIndexes,
  daysInMonth,
  derangeUsers,
  formatDateString,
  generateDailyOffUserIndexes,
  generateRandomAutoPattern,
  getNextOffDayIndexes,
  getPreviousMonthInfo,
  shuffleArray,
  validateAutoPatternRows,
  validateFirstOffDays,
  type AutoAssignMode,
  type AutoAssignTemplate,
  type RotationPattern,
} from './roster-engine.service';

/**
 * Auto Assign — port dari `POST /api/roster/auto-assign` milik TIA.
 *
 * Perbedaan penyimpanan yang perlu diingat: di Icon Living `RosterPattern.patternData`
 * sudah berisi NOMOR shift (0 = OFF), sedangkan TIA menyimpan id shift lalu
 * memetakannya lewat `toShiftNumberPattern`. Karena itu pemetaan tersebut menjadi
 * identitas di sini dan tidak diperlukan lagi.
 */

interface PersonnelLite {
  id: string;
  name: string;
}

interface BuildResult {
  personnel: PersonnelLite[];
  patternRows: number[][];
  source: string;
  previousMonth?: string;
  previousLastDate?: string;
  previousLastOffDays?: number[];
  previousLastOffByPersonnel?: { personnelId: string; personnelName: string; lastOffDay: number }[];
  nextOffDays?: number[];
}

export interface AutoAssignInput {
  month: string;
  mode?: AutoAssignMode;
  template?: string;
  rotationPattern?: string;
}

/** Prefix "YYYY-MM" untuk menyaring tanggal satu bulan. */
function monthPrefix(month: string): string {
  return month.slice(0, 7);
}

export class RosterAutoAssignService {
  // ─── Pembacaan bulan sebelumnya ──────────────────────

  /** Pola bulan lalu per personel, dalam urutan `personnel`. */
  private async readPreviousPatternRows(
    personnel: PersonnelLite[],
    previousMonth: string,
  ): Promise<{ rows: number[][] | null; error?: string }> {
    const assignments = await prisma.rosterAssignment.findMany({
      where: {
        assignmentMonth: previousMonth,
        personnelId: { in: personnel.map((p) => p.id) },
      },
      include: { pattern: { select: { patternData: true } } },
    });

    const byPersonnel = new Map(assignments.map((a) => [a.personnelId, a.pattern.patternData]));

    if (byPersonnel.size !== personnel.length) {
      return {
        rows: null,
        error: `Bulan sebelumnya (${previousMonth}) harus punya assignment untuk kelima personel aktif`,
      };
    }

    const rows: number[][] = [];
    for (const person of personnel) {
      const pattern = byPersonnel.get(person.id);
      if (!pattern || pattern.length === 0) {
        return { rows: null, error: `Pola bulan sebelumnya untuk ${person.name} kosong` };
      }
      rows.push([...pattern]);
    }

    return { rows };
  }

  /** Shift hari terakhir bulan lalu per personel (0 bila OFF). */
  private async readPreviousLastDayStates(
    personnel: PersonnelLite[],
    previousMonth: string,
    previousLastDate: string,
  ): Promise<{ states: number[] | null; error?: string }> {
    const patternResult = await this.readPreviousPatternRows(personnel, previousMonth);
    if (!patternResult.rows) return { states: null, error: patternResult.error };

    const [shiftRows, overrideRows] = await Promise.all([
      prisma.shiftAssignment.findMany({
        where: {
          assignmentDate: previousLastDate,
          personnelId: { in: personnel.map((p) => p.id) },
        },
        include: { shift: { select: { code: true } } },
      }),
      prisma.rosterDayOverride.findMany({
        where: {
          overrideDate: previousLastDate,
          personnelId: { in: personnel.map((p) => p.id) },
        },
        include: { shift: { select: { code: true } } },
      }),
    ]);

    const shiftByPersonnel = new Map<string, number>();
    for (const row of shiftRows) {
      if (shiftByPersonnel.has(row.personnelId)) {
        return {
          states: null,
          error: `Terdapat lebih dari satu shift untuk satu personel pada ${previousLastDate}`,
        };
      }
      shiftByPersonnel.set(row.personnelId, Number(row.shift.code));
    }

    const overrideByPersonnel = new Map(
      overrideRows.map((row) => [
        row.personnelId,
        row.shiftId === null ? 0 : Number(row.shift?.code),
      ]),
    );

    const states: number[] = [];
    const lastDay = Number(previousLastDate.slice(8, 10));

    personnel.forEach((person, index) => {
      const patternRow = patternResult.rows![index];
      const fromOverride = overrideByPersonnel.get(person.id);
      if (fromOverride !== undefined) {
        states.push(fromOverride);
        return;
      }

      const fromShift = shiftByPersonnel.get(person.id);
      // Tanpa baris jadwal berarti hari itu OFF; jatuh kembali ke pola.
      states.push(fromShift ?? patternRow[(lastDay - 1) % patternRow.length]);
    });

    return { states };
  }

  /** Tanggal OFF terakhir bulan lalu per personel. */
  private async readPreviousLastOffDays(
    personnel: PersonnelLite[],
    previousMonth: string,
    previousDays: number,
  ): Promise<{
    lastOffDays: { personnelId: string; personnelName: string; lastOffDay: number }[] | null;
    error?: string;
  }> {
    const patternResult = await this.readPreviousPatternRows(personnel, previousMonth);
    if (!patternResult.rows) return { lastOffDays: null, error: patternResult.error };

    const [shiftRows, overrideRows] = await Promise.all([
      prisma.shiftAssignment.findMany({
        where: {
          assignmentDate: { startsWith: monthPrefix(previousMonth) },
          personnelId: { in: personnel.map((p) => p.id) },
        },
        select: { personnelId: true, assignmentDate: true },
      }),
      prisma.rosterDayOverride.findMany({
        where: {
          overrideDate: { startsWith: monthPrefix(previousMonth) },
          personnelId: { in: personnel.map((p) => p.id) },
        },
        select: { personnelId: true, overrideDate: true, shiftId: true },
      }),
    ]);

    const workedDays = new Map<string, Set<number>>(personnel.map((p) => [p.id, new Set<number>()]));
    for (const row of shiftRows) {
      workedDays.get(row.personnelId)?.add(Number(row.assignmentDate.slice(8, 10)));
    }

    const overrideOffDays = new Map<string, Set<number>>(personnel.map((p) => [p.id, new Set<number>()]));
    const overrideWorkDays = new Map<string, Set<number>>(personnel.map((p) => [p.id, new Set<number>()]));
    for (const row of overrideRows) {
      const day = Number(row.overrideDate.slice(8, 10));
      if (row.shiftId === null) {
        overrideOffDays.get(row.personnelId)?.add(day);
        workedDays.get(row.personnelId)?.delete(day);
      } else {
        overrideWorkDays.get(row.personnelId)?.add(day);
        workedDays.get(row.personnelId)?.add(day);
      }
    }

    const lastOffDays: { personnelId: string; personnelName: string; lastOffDay: number }[] = [];

    for (let index = 0; index < personnel.length; index++) {
      const person = personnel[index];
      const patternRow: number[] = patternResult.rows![index];
      const worked = workedDays.get(person.id)!;
      let lastOffDay: number | null = null;

      for (let day = previousDays; day >= 1; day--) {
        const patternIndex = (day - 1) % patternRow.length;
        if (overrideOffDays.get(person.id)?.has(day)) {
          lastOffDay = day;
          break;
        }
        if (overrideWorkDays.get(person.id)?.has(day)) continue;

        // Hari dianggap OFF hanya bila tidak ada jadwal DAN polanya OFF.
        if (!worked.has(day) && patternRow[patternIndex] === 0) {
          lastOffDay = day;
          break;
        }
      }

      if (!lastOffDay) {
        return {
          lastOffDays: null,
          error: `Bulan sebelumnya (${previousMonth}) tidak punya hari OFF untuk ${person.name}`,
        };
      }

      lastOffDays.push({
        personnelId: person.id,
        personnelName: person.name,
        lastOffDay,
      });
    }

    return { lastOffDays };
  }

  // ─── Pemilih mode ────────────────────────────────────

  private async buildPatternRowsForMode(params: {
    mode: AutoAssignMode;
    template: AutoAssignTemplate;
    rotationPattern: RotationPattern | null;
    personnel: PersonnelLite[];
    year: number;
    monthNum: number;
  }): Promise<BuildResult> {
    const { mode, template, rotationPattern, personnel, year, monthNum } = params;

    if (mode === 'random-pattern') {
      return {
        personnel,
        patternRows: generateRandomAutoPattern(null, null, template, rotationPattern ?? undefined),
        source: 'random-pattern',
      };
    }

    const { previousMonth, previousDays } = getPreviousMonthInfo(year, monthNum);

    if (mode === 'random-personnel') {
      const previous = await this.readPreviousPatternRows(personnel, previousMonth);
      if (!previous.rows) {
        throw new AutoAssignError(`Personil Acak membutuhkan pola bulan sebelumnya. ${previous.error}`);
      }

      const validation = validateAutoPatternRows(previous.rows, template);
      if (!validation.isValid) {
        throw new AutoAssignError(
          `Pola bulan sebelumnya (${previousMonth}) tidak valid: ${validation.error}`,
        );
      }

      return {
        personnel: shuffleArray(personnel),
        patternRows: previous.rows,
        source: 'random-personnel-previous',
        previousMonth,
      };
    }

    if (mode === 'random-personnel-raw') {
      const previous = await this.readPreviousPatternRows(personnel, previousMonth);
      if (!previous.rows) {
        throw new AutoAssignError(
          `Personil Acak Mentah membutuhkan pola bulan sebelumnya. ${previous.error}`,
        );
      }

      const deranged = derangeUsers(personnel, previous.rows);
      if (!deranged) {
        throw new AutoAssignError(
          'Personil Acak Mentah tidak bisa mengacak pola bulan sebelumnya tanpa ada personel yang menerima pola yang sama.',
        );
      }

      return {
        personnel: deranged,
        patternRows: previous.rows,
        source: 'random-personnel-raw-previous',
        previousMonth,
      };
    }

    // continue-previous
    const previousLastDate = formatDateString(
      Number(previousMonth.slice(0, 4)),
      Number(previousMonth.slice(5, 7)),
      previousDays,
    );

    if (template.key === '5p-2s') {
      const previousLastOff = await this.readPreviousLastOffDays(
        personnel,
        previousMonth,
        previousDays,
      );
      if (!previousLastOff.lastOffDays) {
        throw new AutoAssignError(
          `Lanjutkan Bulan Sebelumnya membutuhkan data hari libur terakhir. ${previousLastOff.error}`,
        );
      }

      const maxLastOffDay = Math.max(...previousLastOff.lastOffDays.map((i) => i.lastOffDay));
      const lastOffIndex = personnel.findIndex((person) =>
        previousLastOff.lastOffDays!.some(
          (item) => item.personnelId === person.id && item.lastOffDay === maxLastOffDay,
        ),
      );

      if (lastOffIndex < 0) {
        throw new AutoAssignError(
          'Lanjutkan Bulan Sebelumnya tidak menemukan personel yang OFF terakhir bulan lalu.',
        );
      }

      const dailyOffUserIndexes = generateDailyOffUserIndexes(lastOffIndex);
      const continued = createRowsFromDailyOffUserIndexes(
        dailyOffUserIndexes,
        template,
        rotationPattern ?? undefined,
      );

      if (!continued.rows) {
        throw new AutoAssignError(
          `Lanjutkan Bulan Sebelumnya gagal menyusun roster dari kontinuitas OFF harian. ${continued.error}`,
        );
      }

      return {
        personnel,
        patternRows: continued.rows,
        source: 'continue-previous-daily-off',
        previousMonth,
        previousLastDate,
        previousLastOffDays: previousLastOff.lastOffDays.map((i) => i.lastOffDay),
        previousLastOffByPersonnel: previousLastOff.lastOffDays,
        nextOffDays: dailyOffUserIndexes.map((i) => i + 1),
      };
    }

    const previousLastDay = await this.readPreviousLastDayStates(
      personnel,
      previousMonth,
      previousLastDate,
    );
    const previousLastOff = await this.readPreviousLastOffDays(
      personnel,
      previousMonth,
      previousDays,
    );

    if (!previousLastDay.states) {
      throw new AutoAssignError(
        `Lanjutkan Bulan Sebelumnya membutuhkan jadwal hari terakhir bulan lalu. ${previousLastDay.error}`,
      );
    }
    if (!previousLastOff.lastOffDays) {
      throw new AutoAssignError(
        `Lanjutkan Bulan Sebelumnya membutuhkan data hari libur terakhir. ${previousLastOff.error}`,
      );
    }

    const forcedOffDayIndexes = getNextOffDayIndexes(
      previousLastOff.lastOffDays.map((i) => ({ last_off_day: i.lastOffDay })),
      previousDays,
    );
    const continued = createRowsFromOffDayIndexes(
      forcedOffDayIndexes,
      previousLastDay.states,
      template,
    );

    if (!continued.rows) {
      throw new AutoAssignError(
        `Lanjutkan Bulan Sebelumnya gagal menyusun roster dari aturan kontinuitas. ${continued.error}`,
      );
    }

    const firstOffValidation = validateFirstOffDays(
      continued.rows,
      forcedOffDayIndexes,
      personnel,
    );
    if (!firstOffValidation.isValid) {
      throw new AutoAssignError(
        `Lanjutkan Bulan Sebelumnya menghasilkan kontinuitas OFF yang tidak valid. ${firstOffValidation.error}`,
      );
    }

    return {
      personnel,
      patternRows: continued.rows,
      source: 'continue-previous-last-day',
      previousMonth,
      previousLastDate,
      previousLastOffDays: previousLastOff.lastOffDays.map((i) => i.lastOffDay),
      previousLastOffByPersonnel: previousLastOff.lastOffDays,
      nextOffDays: forcedOffDayIndexes.map((i) => i + 1),
    };
  }

  // ─── Aksi utama ──────────────────────────────────────

  async autoAssign(input: AutoAssignInput, userId?: string) {
    const month = normalizeMonth(input.month);
    const prefix = monthPrefix(month);
    const year = Number(month.slice(0, 4));
    const monthNum = Number(month.slice(5, 7));
    const totalDays = daysInMonth(year, monthNum);

    const mode: AutoAssignMode = (input.mode ?? 'continue-previous') as AutoAssignMode;
    const templateKey = input.template ?? '5p-3s';
    const template = AUTO_ASSIGN_TEMPLATES[templateKey];

    if (!template) {
      throw new ValidationError(
        `Template tidak dikenal. Pilihan: ${Object.keys(AUTO_ASSIGN_TEMPLATES).join(', ')}`,
      );
    }

    const rotationPattern =
      template.key === '5p-2s'
        ? TWO_SHIFT_ROTATION_PATTERNS[input.rotationPattern ?? '1122-off']
        : null;

    if (template.key === '5p-2s' && !rotationPattern) {
      throw new ValidationError(
        `Pola rotasi 5p-2s tidak dikenal. Pilihan: ${Object.keys(TWO_SHIFT_ROTATION_PATTERNS).join(', ')}`,
      );
    }

    // Personel aktif, urut createdAt desc — MENENTUKAN urutan baris pola (sama seperti TIA).
    const personnel = await prisma.securityPersonnel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
    });

    if (personnel.length !== REQUIRED_PERSONNEL_COUNT) {
      throw new ValidationError(
        `Auto Assign membutuhkan tepat ${REQUIRED_PERSONNEL_COUNT} personel aktif. Saat ini ada ${personnel.length}.`,
      );
    }

    const shifts = await prisma.securityShift.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    });

    const shiftIdByNumber = new Map<number, string>();
    for (const shift of shifts) {
      const code = Number(shift.code);
      if (Number.isInteger(code)) shiftIdByNumber.set(code, shift.id);
    }

    const missing = template.activeShifts.filter((n) => !shiftIdByNumber.has(n));
    if (missing.length > 0) {
      throw new ValidationError(
        `${template.name} membutuhkan shift aktif dengan kode ${template.activeShifts.join(', ')}. Belum ada: ${missing.join(', ')}`,
      );
    }

    // AutoAssignError berasal dari mesin murni (bukan AppError), jadi diterjemahkan
    // agar pengurus melihat penyebabnya, bukan "Terjadi kesalahan pada server".
    let built: BuildResult;
    try {
      built = await this.buildPatternRowsForMode({
        mode,
        template,
        rotationPattern,
        personnel,
        year,
        monthNum,
      });
    } catch (error) {
      if (error instanceof AutoAssignError) {
        throw new ValidationError(error.message);
      }
      throw error;
    }

    const assignedPersonnel = built.personnel;
    const patternRows = built.patternRows;

    const result = await prisma.$transaction(async (tx) => {
      // Snapshot dulu, agar Undo bisa mengembalikan keadaan sebelum aksi ini.
      const [prevAssignments, prevShifts] = await Promise.all([
        tx.rosterAssignment.findMany({ where: { assignmentMonth: month } }),
        tx.shiftAssignment.findMany({ where: { assignmentDate: { startsWith: prefix } } }),
      ]);

      const snapshot = await tx.rosterAutoAssignSnapshot.create({
        data: {
          assignmentMonth: month,
          rosterAssignments: JSON.parse(JSON.stringify(prevAssignments)),
          shiftAssignments: JSON.parse(JSON.stringify(prevShifts)),
          createdById: userId ?? null,
        },
        select: { id: true },
      });

      // Simpan pola hasil algoritma sebagai pola bernama otomatis (seperti TIA).
      const patternIds: string[] = [];
      for (let index = 0; index < patternRows.length; index++) {
        const patternName = `Auto ${template.key}${
          rotationPattern ? ` ${rotationPattern.name}` : ''
        } ${month} ${mode} - Pola ${index + 1}`;
        const description = `Pola hasil Auto Assign (${mode}, ${template.name}${
          rotationPattern ? `, ${rotationPattern.name}` : ''
        }) untuk ${month}.`;

        const existing = await tx.rosterPattern.findFirst({
          where: { name: patternName },
          select: { id: true },
        });

        const saved = existing
          ? await tx.rosterPattern.update({
              where: { id: existing.id },
              data: { description, patternData: patternRows[index], isActive: true },
              select: { id: true },
            })
          : await tx.rosterPattern.create({
              data: {
                name: patternName,
                description,
                patternData: patternRows[index],
                isActive: true,
                createdById: userId ?? null,
              },
              select: { id: true },
            });

        patternIds.push(saved.id);
      }

      // Bersihkan jadwal & override bulan ini.
      const deleted = await tx.shiftAssignment.deleteMany({
        where: { assignmentDate: { startsWith: prefix } },
      });
      await tx.rosterDayOverride.deleteMany({ where: { overrideDate: { startsWith: prefix } } });

      // Petakan personel → pola.
      for (let index = 0; index < assignedPersonnel.length; index++) {
        await tx.rosterAssignment.upsert({
          where: {
            personnelId_assignmentMonth: {
              personnelId: assignedPersonnel[index].id,
              assignmentMonth: month,
            },
          },
          create: {
            personnelId: assignedPersonnel[index].id,
            patternId: patternIds[index],
            assignmentMonth: month,
            assignedById: userId ?? null,
          },
          update: { patternId: patternIds[index], assignedById: userId ?? null },
        });
      }

      // Tulis jadwal harian. Hari OFF (0) tidak disimpan.
      const rowsToCreate: {
        personnelId: string;
        shiftId: string;
        assignmentDate: string;
        createdById: string | null;
      }[] = [];

      for (let day = 1; day <= totalDays; day++) {
        const dateString = formatDateString(year, monthNum, day);

        for (let index = 0; index < assignedPersonnel.length; index++) {
          const row = patternRows[index];
          const shiftNumber = row[(day - 1) % row.length];
          if (shiftNumber === 0) continue;

          const shiftId = shiftIdByNumber.get(shiftNumber);
          if (!shiftId) continue;

          rowsToCreate.push({
            personnelId: assignedPersonnel[index].id,
            shiftId,
            assignmentDate: dateString,
            createdById: userId ?? null,
          });
        }
      }

      const createdResult = await tx.shiftAssignment.createMany({
        data: rowsToCreate,
        skipDuplicates: true,
      });

      return {
        snapshotId: snapshot.id,
        deleted: deleted.count,
        created: createdResult.count,
        patterns: patternIds.length,
      };
    },
    // Transaksi ini menjalankan belasan kueri berurutan; batas bawaan Prisma (5 dtk)
    // terlalu ketat untuk database yang diakses lewat jaringan.
    { timeout: 30_000, maxWait: 15_000 });

    logger.info('[roster] auto-assign selesai', {
      month,
      mode,
      template: template.key,
      created: result.created,
    });

    return {
      month,
      mode,
      template: template.key,
      templateName: template.name,
      rotationPattern: rotationPattern?.key,
      rotationPatternName: rotationPattern?.name,
      source: built.source,
      previousMonth: built.previousMonth,
      previousLastDate: built.previousLastDate,
      previousLastOffDays: built.previousLastOffDays,
      previousLastOffByPersonnel: built.previousLastOffByPersonnel,
      nextOffDays: built.nextOffDays,
      days: totalDays,
      personnel: assignedPersonnel.length,
      patterns: result.patterns,
      deleted: result.deleted,
      created: result.created,
      undoSnapshotId: result.snapshotId,
      assignments: assignedPersonnel.map((person, index) => ({
        personnelId: person.id,
        personnelName: person.name,
        patternRow: patternRows[index],
      })),
      rule: {
        beforeOffShift: template.beforeOffShift,
        afterOffShift: template.afterOffShift,
        shift1DailyPersonnel: template.shift1DailyPersonnel,
        shift3DailyPersonnel: template.shift3DailyPersonnel,
        dailyOffPersonnel: template.dailyOffPersonnel,
        activeShifts: template.activeShifts,
        patternLength: template.patternLength,
        preventShift3ToShift1: template.preventShift3ToShift1,
      },
    };
  }

  /** Kembalikan keadaan roster ke snapshot terakhir yang belum dipulihkan. */
  async undo(monthInput: string, userId?: string) {
    const month = normalizeMonth(monthInput);
    const prefix = monthPrefix(month);

    const snapshot = await prisma.rosterAutoAssignSnapshot.findFirst({
      where: { assignmentMonth: month, restoredAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot) {
      throw new ValidationError('Tidak ada data Undo Auto Assign untuk bulan ini.');
    }

    const savedAssignments = (snapshot.rosterAssignments ?? []) as unknown as {
      personnelId: string;
      patternId: string;
      assignmentMonth: string;
      assignedById: string | null;
      notes: string | null;
    }[];
    const savedShifts = (snapshot.shiftAssignments ?? []) as unknown as {
      personnelId: string;
      shiftId: string;
      assignmentDate: string;
      isReplacement: boolean;
      notes: string | null;
      createdById: string | null;
    }[];

    const result = await prisma.$transaction(async (tx) => {
      const deletedShifts = await tx.shiftAssignment.deleteMany({
        where: { assignmentDate: { startsWith: prefix } },
      });
      await tx.rosterDayOverride.deleteMany({ where: { overrideDate: { startsWith: prefix } } });
      const deletedAssignments = await tx.rosterAssignment.deleteMany({
        where: { assignmentMonth: month },
      });

      let restoredAssignments = 0;
      for (const item of savedAssignments) {
        await tx.rosterAssignment.create({
          data: {
            personnelId: item.personnelId,
            patternId: item.patternId,
            assignmentMonth: item.assignmentMonth,
            assignedById: item.assignedById,
            notes: item.notes,
          },
        });
        restoredAssignments += 1;
      }

      const restoredShifts = await tx.shiftAssignment.createMany({
        data: savedShifts.map((item) => ({
          personnelId: item.personnelId,
          shiftId: item.shiftId,
          assignmentDate: item.assignmentDate,
          isReplacement: item.isReplacement,
          notes: item.notes,
          createdById: item.createdById,
        })),
        skipDuplicates: true,
      });

      await tx.rosterAutoAssignSnapshot.update({
        where: { id: snapshot.id },
        data: { restoredAt: new Date(), restoredById: userId ?? null },
      });

      return {
        deletedAssignments: deletedAssignments.count,
        deletedShifts: deletedShifts.count,
        restoredAssignments,
        restoredShifts: restoredShifts.count,
      };
    },
    { timeout: 30_000, maxWait: 15_000 });

    return { month, snapshotId: snapshot.id, ...result };
  }

  /** Apakah ada snapshot yang bisa di-Undo untuk bulan ini. */
  async hasUndo(monthInput: string): Promise<boolean> {
    const month = normalizeMonth(monthInput);
    const count = await prisma.rosterAutoAssignSnapshot.count({
      where: { assignmentMonth: month, restoredAt: null },
    });
    return count > 0;
  }
}

export const rosterAutoAssignService = new RosterAutoAssignService();
