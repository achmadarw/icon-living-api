/**
 * Mesin penyusun pola roster satpam.
 *
 * Ini adalah PORT 1:1 dari algoritma `tia_security_backend/src/routes/roster.routes.js`
 * (proyek TIA) yang sudah dipakai user. Aturan bisnis TIDAK BOLEH berubah.
 *
 * Semua fungsi di berkas ini MURNI — tidak menyentuh database sama sekali. Orkestrasi
 * DB ada di `roster.service.ts`. Pemisahan ini yang memungkinkan tiap aturan diuji satuan.
 *
 * Representasi:
 * - `rows[userIndex][dayIndex]` = nomor shift; 0 = OFF; null = belum terisi.
 * - Nomor shift 1/2/3 merujuk pada `SecurityShift.code`, bukan id database.
 */

// ─── Tipe ───────────────────────────────────────────────

export interface AutoAssignTemplate {
  key: '5p-3s' | '5p-2s';
  name: string;
  patternLength: number;
  activeShifts: number[];
  /** Shift wajib pada hari SEBELUM OFF (null = tidak diatur). */
  beforeOffShift: number | null;
  /** Shift wajib pada hari SESUDAH OFF (null = tidak diatur). */
  afterOffShift: number | null;
  shift1DailyPersonnel: number;
  shift3DailyPersonnel: number | null;
  dailyOffPersonnel: number | null;
  minOffDaysPerPatternRow: number;
  maxOffDaysPerPatternRow: number;
  preventShift3ToShift1: boolean;
}

export interface RotationPattern {
  key: '1122-off' | '2211-off';
  name: string;
  shiftsAfterOff: number[];
}

export type PatternRow = (number | null)[];
export type PatternRows = PatternRow[];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface RowsResult {
  rows: number[][] | null;
  error?: string;
}

/** Sumber angka acak; bisa diganti saat pengujian agar hasil deterministik. */
export type Rng = () => number;

const defaultRng: Rng = Math.random;

export type AutoAssignMode =
  | 'random-pattern'
  | 'random-personnel'
  | 'random-personnel-raw'
  | 'continue-previous';

export const AUTO_ASSIGN_MODES: AutoAssignMode[] = [
  'random-pattern',
  'random-personnel',
  'random-personnel-raw',
  'continue-previous',
];

/** Jumlah personel yang diwajibkan — TIA menolak jika bukan tepat 5. */
export const REQUIRED_PERSONNEL_COUNT = 5;

// ─── Template ───────────────────────────────────────────

export const AUTO_ASSIGN_TEMPLATES: Record<string, AutoAssignTemplate> = {
  '5p-3s': {
    key: '5p-3s',
    name: '5 Personil - 3 Shift',
    patternLength: 7,
    activeShifts: [1, 2, 3],
    beforeOffShift: 2,
    afterOffShift: 1,
    shift1DailyPersonnel: 1,
    shift3DailyPersonnel: 2,
    dailyOffPersonnel: null,
    minOffDaysPerPatternRow: 1,
    maxOffDaysPerPatternRow: 1,
    preventShift3ToShift1: true,
  },
  '5p-2s': {
    key: '5p-2s',
    name: '5 Personil - 2 Shift',
    patternLength: 5,
    activeShifts: [1, 2],
    beforeOffShift: null,
    afterOffShift: null,
    shift1DailyPersonnel: 2,
    shift3DailyPersonnel: null,
    dailyOffPersonnel: 1,
    minOffDaysPerPatternRow: 1,
    maxOffDaysPerPatternRow: 1,
    preventShift3ToShift1: false,
  },
};

export const TWO_SHIFT_ROTATION_PATTERNS: Record<string, RotationPattern> = {
  '1122-off': { key: '1122-off', name: '1122OFF', shiftsAfterOff: [1, 1, 2, 2] },
  '2211-off': { key: '2211-off', name: '2211OFF', shiftsAfterOff: [2, 2, 1, 1] },
};

// ─── Utilitas dasar ─────────────────────────────────────

export class AutoAssignError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AutoAssignError';
    this.statusCode = statusCode;
  }
}

/** Fisher–Yates, identik dengan TIA. */
export function shuffleArray<T>(items: T[], rng: Rng = defaultRng): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function arePatternsEqual(first: number[], second: number[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/** Terjemahkan pola berisi id/kode shift menjadi nomor shift template. */
export function toShiftNumberPattern(
  pattern: number[],
  shiftNumberById: Record<string | number, number>,
): (number | null)[] {
  return pattern.map((shiftId) => (shiftId === 0 ? 0 : (shiftNumberById[Number(shiftId)] ?? null)));
}

/** Deteksi transisi terlarang shift 3 → shift 1 (siklik, termasuk sambungan akhir ke awal). */
export function hasShift3ToShift1Transition(row: (number | null)[]): boolean {
  return row.some(
    (shiftNumber, dayIndex) => shiftNumber === 3 && row[(dayIndex + 1) % row.length] === 1,
  );
}

// ─── Validasi pola ──────────────────────────────────────

export function validateAutoPatternRows(
  rows: (number | null)[][],
  template: AutoAssignTemplate = AUTO_ASSIGN_TEMPLATES['5p-3s'],
): ValidationResult {
  if (!Array.isArray(rows) || rows.length !== REQUIRED_PERSONNEL_COUNT) {
    return { isValid: false, error: 'Pattern must contain exactly 5 personnel rows' };
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (!Array.isArray(row) || row.length !== template.patternLength) {
      return {
        isValid: false,
        error: `Pattern row ${rowIndex + 1} must contain ${template.patternLength} days`,
      };
    }

    const allowedValues = [0, ...template.activeShifts];

    if (!row.every((value) => value !== null && allowedValues.includes(value))) {
      return { isValid: false, error: `Pattern row ${rowIndex + 1} contains invalid shift values` };
    }

    const offDays = row
      .map((value, dayIndex) => (value === 0 ? dayIndex : null))
      .filter((dayIndex): dayIndex is number => dayIndex !== null);

    if (
      offDays.length < template.minOffDaysPerPatternRow ||
      offDays.length > template.maxOffDaysPerPatternRow
    ) {
      const offDayError =
        template.minOffDaysPerPatternRow === template.maxOffDaysPerPatternRow
          ? `Pattern row ${rowIndex + 1} must have exactly ${template.minOffDaysPerPatternRow} OFF day`
          : `Pattern row ${rowIndex + 1} must have between ${template.minOffDaysPerPatternRow} and ${template.maxOffDaysPerPatternRow} OFF days`;
      return { isValid: false, error: offDayError };
    }

    for (const offDay of offDays) {
      const previousDay = (offDay + template.patternLength - 1) % template.patternLength;
      const nextDay = (offDay + 1) % template.patternLength;

      if (template.beforeOffShift !== null && row[previousDay] !== template.beforeOffShift) {
        return {
          isValid: false,
          error: `Pattern row ${rowIndex + 1} must have shift ${template.beforeOffShift} before OFF`,
        };
      }

      if (template.afterOffShift !== null && row[nextDay] !== template.afterOffShift) {
        return {
          isValid: false,
          error: `Pattern row ${rowIndex + 1} must have shift ${template.afterOffShift} after OFF`,
        };
      }
    }

    if (template.preventShift3ToShift1 && hasShift3ToShift1Transition(row)) {
      return {
        isValid: false,
        error: `Pattern row ${rowIndex + 1} must not have shift 3 followed by shift 1`,
      };
    }
  }

  for (let dayIndex = 0; dayIndex < template.patternLength; dayIndex++) {
    const offCount = rows.filter((row) => row[dayIndex] === 0).length;
    const shift1Count = rows.filter((row) => row[dayIndex] === 1).length;
    const shift3Count = rows.filter((row) => row[dayIndex] === 3).length;

    if (template.dailyOffPersonnel !== null && offCount !== template.dailyOffPersonnel) {
      return {
        isValid: false,
        error: `Day ${dayIndex + 1} must have exactly ${template.dailyOffPersonnel} personnel OFF`,
      };
    }

    if (shift1Count !== template.shift1DailyPersonnel) {
      return {
        isValid: false,
        error: `Day ${dayIndex + 1} must have exactly ${template.shift1DailyPersonnel} personnel on shift 1`,
      };
    }

    if (template.shift3DailyPersonnel !== null && shift3Count !== template.shift3DailyPersonnel) {
      return {
        isValid: false,
        error: `Day ${dayIndex + 1} must have exactly ${template.shift3DailyPersonnel} personnel on shift 3`,
      };
    }
  }

  return { isValid: true };
}

// ─── Pengisian sel kosong (5p-3s) ───────────────────────

type ShiftCounts = Record<number, number>;

/** Skor penyeimbang: shift 1 dan 2 diseimbangkan, shift 3 ditekan jumlahnya. */
export function getShiftCountBalance(
  counts: ShiftCounts[],
  userIndex: number,
  shiftNumber: number,
): number {
  if (shiftNumber === 1 || shiftNumber === 2) {
    return Math.abs(
      counts[userIndex][1] + (shiftNumber === 1 ? 1 : 0) -
        (counts[userIndex][2] + (shiftNumber === 2 ? 1 : 0)),
    );
  }
  return counts[userIndex][3] + 1;
}

interface FillOption {
  assignment: { userIndex: number; shiftNumber: number }[];
  score: number;
}

/**
 * Susun semua kombinasi pengisian untuk satu hari, diurutkan dari skor terbaik.
 *
 * Catatan: kuota (1 orang shift 1, 2 orang shift 3) dan modulo 7 sengaja
 * dipertahankan hardcoded seperti TIA, karena fungsi ini hanya dipakai template 5p-3s.
 */
export function getDayFillOptions(
  rows: (number | null)[][],
  counts: ShiftCounts[],
  dayIndex: number,
): FillOption[] | null {
  const emptyUserIndexes = rows
    .map((row, userIndex) => ({ row, userIndex }))
    .filter(({ row }) => row[dayIndex] === null)
    .map(({ userIndex }) => userIndex);

  const existingShift1Count = rows.filter((row) => row[dayIndex] === 1).length;
  const existingShift3Count = rows.filter((row) => row[dayIndex] === 3).length;
  const neededShift1Count = 1 - existingShift1Count;
  const neededShift3Count = 2 - existingShift3Count;

  if (
    neededShift1Count < 0 ||
    neededShift1Count > emptyUserIndexes.length ||
    neededShift3Count < 0 ||
    neededShift3Count > emptyUserIndexes.length
  ) {
    return null;
  }

  const options: FillOption[] = [];
  const candidateValues = [1, 2, 3];

  const canPlaceShift = (userIndex: number, shiftNumber: number) => {
    const previousDayIndex = (dayIndex + 6) % 7;
    const nextDayIndex = (dayIndex + 1) % 7;
    const previousShift = rows[userIndex][previousDayIndex];
    const nextShift = rows[userIndex][nextDayIndex];

    if (previousShift === 3 && shiftNumber === 1) return false;
    if (shiftNumber === 3 && nextShift === 1) return false;
    return true;
  };

  const buildOptions = (
    emptyIndex: number,
    assignment: { userIndex: number; shiftNumber: number }[],
    shift1Count: number,
    shift3Count: number,
  ): void => {
    if (emptyIndex === emptyUserIndexes.length) {
      if (shift1Count !== neededShift1Count) return;
      if (shift3Count !== neededShift3Count) return;

      const score = assignment.reduce(
        (total, { userIndex, shiftNumber }) => total + getShiftCountBalance(counts, userIndex, shiftNumber),
        0,
      );
      options.push({ assignment, score });
      return;
    }

    const userIndex = emptyUserIndexes[emptyIndex];

    for (const shiftNumber of candidateValues) {
      const nextShift1Count = shift1Count + (shiftNumber === 1 ? 1 : 0);
      const nextShift3Count = shift3Count + (shiftNumber === 3 ? 1 : 0);
      const remainingSlots = emptyUserIndexes.length - emptyIndex - 1;

      if (nextShift1Count > neededShift1Count) continue;
      if (nextShift1Count + remainingSlots < neededShift1Count) continue;
      if (nextShift3Count > neededShift3Count) continue;
      if (nextShift3Count + remainingSlots < neededShift3Count) continue;
      if (!canPlaceShift(userIndex, shiftNumber)) continue;

      buildOptions(
        emptyIndex + 1,
        [...assignment, { userIndex, shiftNumber }],
        nextShift1Count,
        nextShift3Count,
      );
    }
  };

  buildOptions(0, [], 0, 0);

  return options.sort((first, second) => first.score - second.score);
}

/** Isi sel kosong dengan backtracking sampai semua aturan harian terpenuhi. */
export function fillRemainingShifts(rows: (number | null)[][]): ValidationResult {
  const counts: ShiftCounts[] = Array.from({ length: REQUIRED_PERSONNEL_COUNT }, () => ({
    1: 0,
    2: 0,
    3: 0,
  }));

  const patternLength = rows[0]?.length || 0;

  for (let userIndex = 0; userIndex < REQUIRED_PERSONNEL_COUNT; userIndex++) {
    for (let dayIndex = 0; dayIndex < patternLength; dayIndex++) {
      const shiftNumber = rows[userIndex][dayIndex];
      if (shiftNumber && counts[userIndex][shiftNumber] !== undefined) {
        counts[userIndex][shiftNumber]++;
      }
    }
  }

  const fillDay = (dayIndex: number): boolean => {
    if (dayIndex === 7) {
      return rows.every((row) => !hasShift3ToShift1Transition(row));
    }

    const options = getDayFillOptions(rows, counts, dayIndex);
    if (!options || options.length === 0) return false;

    for (const { assignment } of options) {
      for (const { userIndex, shiftNumber } of assignment) {
        rows[userIndex][dayIndex] = shiftNumber;
        counts[userIndex][shiftNumber]++;
      }

      if (fillDay(dayIndex + 1)) return true;

      for (const { userIndex, shiftNumber } of assignment) {
        rows[userIndex][dayIndex] = null;
        counts[userIndex][shiftNumber]--;
      }
    }

    return false;
  };

  if (!fillDay(0)) {
    return {
      isValid: false,
      error:
        'Unable to fill remaining shifts with exactly 1 personnel on shift 1 and without shift 3 followed by shift 1',
    };
  }

  return { isValid: true };
}

/**
 * Varian 2 shift.
 *
 * CATATAN: di TIA fungsi ini memakai variabel `patternLength` yang tidak pernah
 * dideklarasikan di scope-nya — akan melempar ReferenceError bila dipanggil. Ternyata
 * fungsi ini TIDAK PERNAH terpanggil (alur 5p-2s memakai createRowsFromDailyOffUserIndexes),
 * sehingga bug tersebut laten. Di sini bug diperbaiki dengan menurunkan panjang dari `rows`,
 * namun alur pemanggilan dibiarkan sama persis sehingga perilaku sistem tidak berubah.
 */
export function fillRemainingTwoShiftRows(rows: (number | null)[][]): ValidationResult {
  const counts: ShiftCounts[] = Array.from({ length: REQUIRED_PERSONNEL_COUNT }, () => ({
    1: 0,
    2: 0,
  }));

  const patternLength = rows[0]?.length || 0;

  for (let userIndex = 0; userIndex < REQUIRED_PERSONNEL_COUNT; userIndex++) {
    for (let dayIndex = 0; dayIndex < patternLength; dayIndex++) {
      const shiftNumber = rows[userIndex][dayIndex];
      if (shiftNumber && counts[userIndex][shiftNumber] !== undefined) {
        counts[userIndex][shiftNumber]++;
      }
    }
  }

  for (let dayIndex = 0; dayIndex < patternLength; dayIndex++) {
    const existingShift1Count = rows.filter((row) => row[dayIndex] === 1).length;
    const neededShift1Count = 2 - existingShift1Count;
    const candidates = rows
      .map((row, userIndex) => ({ row, userIndex }))
      .filter(({ row }) => row[dayIndex] === null)
      .sort((first, second) => {
        if (counts[first.userIndex][1] !== counts[second.userIndex][1]) {
          return counts[first.userIndex][1] - counts[second.userIndex][1];
        }
        return first.userIndex - second.userIndex;
      });

    if (neededShift1Count < 0 || neededShift1Count > candidates.length) {
      return {
        isValid: false,
        error: `Day ${dayIndex + 1} cannot be filled with exactly 2 personnel on shift 1`,
      };
    }

    for (const { userIndex } of candidates.slice(0, neededShift1Count)) {
      rows[userIndex][dayIndex] = 1;
      counts[userIndex][1]++;
    }

    for (const { userIndex } of candidates.slice(neededShift1Count)) {
      rows[userIndex][dayIndex] = 2;
      counts[userIndex][2]++;
    }
  }

  return { isValid: true };
}

// ─── Pembentukan baris pola ─────────────────────────────

/** Bentuk pola 5p-3s dari indeks hari OFF tiap personel. */
export function createRowsFromOffDayIndexes(
  offDayIndexes: number[],
  previousLastDayStates: (number | null)[] | null = null,
  template: AutoAssignTemplate = AUTO_ASSIGN_TEMPLATES['5p-3s'],
): RowsResult {
  const rows: (number | null)[][] = Array.from({ length: REQUIRED_PERSONNEL_COUNT }, () =>
    Array(7).fill(null),
  );

  for (let userIndex = 0; userIndex < REQUIRED_PERSONNEL_COUNT; userIndex++) {
    const offDay = offDayIndexes[userIndex];
    const previousShift = previousLastDayStates?.[userIndex];

    if (offDay < 0 || offDay > 6) {
      return { rows: null, error: `Personnel row ${userIndex + 1} has invalid OFF day index` };
    }

    if (
      template.beforeOffShift !== null &&
      offDay === 0 &&
      previousShift !== undefined &&
      previousShift !== template.beforeOffShift
    ) {
      return {
        rows: null,
        error: `Personnel row ${userIndex + 1} is OFF on day 1, so the previous month's last day must be shift ${template.beforeOffShift}`,
      };
    }

    const forcedDays: [number, number][] = [[offDay, 0]];
    if (template.beforeOffShift !== null) forcedDays.push([(offDay + 6) % 7, template.beforeOffShift]);
    if (template.afterOffShift !== null) forcedDays.push([(offDay + 1) % 7, template.afterOffShift]);

    for (const [dayIndex, shiftNumber] of forcedDays) {
      if (rows[userIndex][dayIndex] !== null && rows[userIndex][dayIndex] !== shiftNumber) {
        return {
          rows: null,
          error: `Personnel row ${userIndex + 1} has conflicting OFF rule assignments`,
        };
      }
      rows[userIndex][dayIndex] = shiftNumber;
    }

    if (template.afterOffShift !== null && previousShift === 0) {
      if (rows[userIndex][0] !== null && rows[userIndex][0] !== template.afterOffShift) {
        return {
          rows: null,
          error: `Personnel row ${userIndex + 1} was OFF on the previous month's last day, so day 1 must be shift ${template.afterOffShift}`,
        };
      }
      rows[userIndex][0] = template.afterOffShift;
    }
  }

  const fillResult =
    template.key === '5p-2s' ? fillRemainingTwoShiftRows(rows) : fillRemainingShifts(rows);

  if (!fillResult.isValid) return { rows: null, error: fillResult.error };

  const validation = validateAutoPatternRows(rows, template);
  if (!validation.isValid) return { rows: null, error: validation.error };

  if (previousLastDayStates) {
    const boundaryValidation = validateBoundaryWithPreviousLastDay(
      rows,
      previousLastDayStates,
      template,
    );
    if (!boundaryValidation.isValid) return { rows: null, error: boundaryValidation.error };
  }

  return { rows: rows as number[][] };
}

/** Bentuk pola 5p-2s dari indeks personel yang OFF tiap hari + pola rotasi. */
export function createRowsFromDailyOffUserIndexes(
  dailyOffUserIndexes: number[],
  template: AutoAssignTemplate = AUTO_ASSIGN_TEMPLATES['5p-2s'],
  rotationPattern: RotationPattern = TWO_SHIFT_ROTATION_PATTERNS['1122-off'],
): RowsResult {
  const rows: (number | null)[][] = Array.from({ length: REQUIRED_PERSONNEL_COUNT }, () =>
    Array(template.patternLength).fill(null),
  );

  if (!Array.isArray(dailyOffUserIndexes) || dailyOffUserIndexes.length !== template.patternLength) {
    return { rows: null, error: `Daily OFF pattern must contain ${template.patternLength} days` };
  }

  if (new Set(dailyOffUserIndexes).size !== dailyOffUserIndexes.length) {
    return { rows: null, error: 'Daily OFF pattern must not contain duplicate personnel indexes' };
  }

  for (let dayIndex = 0; dayIndex < template.patternLength; dayIndex++) {
    const offUserIndex = dailyOffUserIndexes[dayIndex];

    if (offUserIndex < 0 || offUserIndex >= REQUIRED_PERSONNEL_COUNT) {
      return { rows: null, error: `Day ${dayIndex + 1} has invalid OFF personnel index` };
    }

    rows[offUserIndex][dayIndex] = 0;
    rotationPattern.shiftsAfterOff.forEach((shiftNumber, offsetIndex) => {
      const previousOffDayIndex =
        (dayIndex + template.patternLength - offsetIndex - 1) % template.patternLength;
      const userIndex = dailyOffUserIndexes[previousOffDayIndex];
      rows[userIndex][dayIndex] = shiftNumber;
    });
  }

  const validation = validateAutoPatternRows(rows, template);
  if (!validation.isValid) return { rows: null, error: validation.error };

  return { rows: rows as number[][] };
}

/** Urutan personel yang OFF tiap hari, melanjutkan dari personel OFF terakhir bulan lalu. */
export function generateDailyOffUserIndexes(
  lastOffUserIndex: number | null = null,
  rng: Rng = defaultRng,
): number[] {
  const startIndex =
    lastOffUserIndex === null ? Math.floor(rng() * 5) : (lastOffUserIndex + 1) % 5;
  return Array.from({ length: 5 }, (_, dayIndex) => (startIndex + dayIndex) % 5);
}

/** Coba sampai 500 kali menyusun pola acak yang lolos semua aturan. */
export function generateRandomAutoPattern(
  previousLastDayStates: (number | null)[] | null = null,
  forcedOffDayIndexes: number[] | null = null,
  template: AutoAssignTemplate = AUTO_ASSIGN_TEMPLATES['5p-3s'],
  rotationPattern: RotationPattern = TWO_SHIFT_ROTATION_PATTERNS['1122-off'],
  rng: Rng = defaultRng,
): number[][] {
  if (template.key === '5p-2s') {
    const result = createRowsFromDailyOffUserIndexes(
      generateDailyOffUserIndexes(null, rng),
      template,
      rotationPattern,
    );
    if (result.rows) return result.rows;
    throw new AutoAssignError(`Unable to create a valid ${template.name} pattern`);
  }

  for (let attempt = 0; attempt < 500; attempt++) {
    const offDays = forcedOffDayIndexes || shuffleArray([0, 1, 2, 3, 4, 5, 6], rng).slice(0, 5);
    const result = createRowsFromOffDayIndexes(offDays, previousLastDayStates, template);

    if (result.rows) return result.rows;
    if (forcedOffDayIndexes) break;
  }

  if (previousLastDayStates) {
    throw new AutoAssignError(
      'Unable to create a valid pattern that continues from the previous month last-day schedule',
    );
  }

  throw new AutoAssignError(`Unable to create a valid ${template.name} pattern`);
}

// ─── Derangement personel ───────────────────────────────

export interface DerangeableUser {
  id: string;
}

/**
 * Acak personel sehingga TIDAK ADA yang menerima pola yang sama dengan bulan lalu.
 * Coba 100 kali secara acak; bila gagal, jatuh ke backtracking deterministik.
 */
export function derangeUsers<T extends DerangeableUser>(
  users: T[],
  patternRows: number[][] | null = null,
  rng: Rng = defaultRng,
): T[] | null {
  if (users.length < 2) return null;

  const indexedUsers = users.map((user, index) => ({ ...user, originalIndex: index }));

  const canUseUserForPattern = (
    user: { originalIndex: number },
    patternIndex: number,
  ): boolean => {
    if (user.originalIndex === patternIndex) return false;
    if (!patternRows) return true;
    return !arePatternsEqual(patternRows[patternIndex], patternRows[user.originalIndex]);
  };

  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffledUsers = shuffleArray(indexedUsers, rng);
    if (shuffledUsers.every((user, index) => canUseUserForPattern(user, index))) {
      return shuffledUsers.map(({ originalIndex: _ignored, ...user }) => user as unknown as T);
    }
  }

  const assignedUsers: (typeof indexedUsers[number] | undefined)[] = [];
  const usedUserIds = new Set<string>();

  const assignNextPattern = (patternIndex: number): boolean => {
    if (patternIndex === users.length) return true;

    for (const user of indexedUsers) {
      if (usedUserIds.has(user.id)) continue;
      if (!canUseUserForPattern(user, patternIndex)) continue;

      assignedUsers[patternIndex] = user;
      usedUserIds.add(user.id);

      if (assignNextPattern(patternIndex + 1)) return true;

      usedUserIds.delete(user.id);
      assignedUsers[patternIndex] = undefined;
    }

    return false;
  };

  if (!assignNextPattern(0)) return null;

  return assignedUsers.map((user) => {
    const { originalIndex: _ignored, ...rest } = user!;
    return rest as unknown as T;
  });
}

// ─── Kontinuitas dengan bulan sebelumnya ────────────────

/**
 * Hitung indeks hari OFF pertama bulan ini dari hari OFF terakhir bulan lalu,
 * dengan asumsi siklus 7 hari.
 */
export function getNextOffDayIndexes(
  previousLastOffDays: { last_off_day: number }[],
  previousDays: number,
): number[] {
  return previousLastOffDays.map(({ last_off_day: lastOffDay }) => {
    const daysSinceLastOffAtMonthStart = previousDays - lastOffDay;
    const nextOffDay = 7 - (daysSinceLastOffAtMonthStart % 7);
    return nextOffDay - 1;
  });
}

export function validateFirstOffDays(
  rows: (number | null)[][],
  expectedOffDayIndexes: number[],
  users: { name: string }[],
): ValidationResult {
  for (let userIndex = 0; userIndex < rows.length; userIndex++) {
    const actualOffDayIndex = rows[userIndex].findIndex((shiftNumber) => shiftNumber === 0);
    const expectedOffDayIndex = expectedOffDayIndexes[userIndex];

    if (actualOffDayIndex !== expectedOffDayIndex) {
      return {
        isValid: false,
        error: `${users[userIndex].name} should be OFF on day ${
          expectedOffDayIndex + 1
        }, but generated OFF is day ${actualOffDayIndex + 1}`,
      };
    }
  }

  return { isValid: true };
}

/** Pastikan sambungan hari terakhir bulan lalu ke hari pertama bulan ini tetap sah. */
export function validateBoundaryWithPreviousLastDay(
  rows: (number | null)[][],
  previousLastDayStates: (number | null)[],
  template: AutoAssignTemplate = AUTO_ASSIGN_TEMPLATES['5p-3s'],
): ValidationResult {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const previousShift = previousLastDayStates[rowIndex];
    const firstDayShift = rows[rowIndex][0];

    if (
      template.afterOffShift !== null &&
      previousShift === 0 &&
      firstDayShift !== template.afterOffShift
    ) {
      return {
        isValid: false,
        error: `Personnel row ${rowIndex + 1} was OFF on the previous month's last day, so day 1 must be shift ${template.afterOffShift}`,
      };
    }

    if (
      template.beforeOffShift !== null &&
      firstDayShift === 0 &&
      previousShift !== template.beforeOffShift
    ) {
      return {
        isValid: false,
        error: `Personnel row ${rowIndex + 1} is OFF on day 1, so the previous month's last day must be shift ${template.beforeOffShift}`,
      };
    }

    if (template.preventShift3ToShift1 && previousShift === 3 && firstDayShift === 1) {
      return {
        isValid: false,
        error: `Personnel row ${rowIndex + 1} must not move from shift 3 on the previous month's last day to shift 1 on day 1`,
      };
    }
  }

  return { isValid: true };
}

// ─── Utilitas tanggal (string, bebas timezone) ──────────

/** "YYYY-MM-DD" tanpa menyentuh objek Date, meniru formatDate() milik TIA. */
export function formatDateString(year: number, monthNum: number, day: number): string {
  return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, monthNum: number): number {
  return new Date(year, monthNum, 0).getDate();
}

export function getPreviousMonthInfo(
  year: number,
  monthNum: number,
): { previousMonth: string; previousDays: number } {
  const previousMonthDate = new Date(year, monthNum - 2, 1);
  const previousYear = previousMonthDate.getFullYear();
  const previousMonthNum = previousMonthDate.getMonth() + 1;

  return {
    previousMonth: formatDateString(previousYear, previousMonthNum, 1),
    previousDays: daysInMonth(previousYear, previousMonthNum),
  };
}
