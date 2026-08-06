import { describe, it, expect } from 'vitest';
import {
  AUTO_ASSIGN_TEMPLATES,
  TWO_SHIFT_ROTATION_PATTERNS,
  validateAutoPatternRows,
  hasShift3ToShift1Transition,
  createRowsFromOffDayIndexes,
  createRowsFromDailyOffUserIndexes,
  generateDailyOffUserIndexes,
  generateRandomAutoPattern,
  derangeUsers,
  arePatternsEqual,
  shuffleArray,
  getNextOffDayIndexes,
  validateFirstOffDays,
  validateBoundaryWithPreviousLastDay,
  fillRemainingShifts,
  toShiftNumberPattern,
  formatDateString,
  getPreviousMonthInfo,
  daysInMonth,
  AutoAssignError,
  type Rng,
} from '../services/roster-engine.service';

const T3 = AUTO_ASSIGN_TEMPLATES['5p-3s'];
const T2 = AUTO_ASSIGN_TEMPLATES['5p-2s'];

/** RNG deterministik agar hasil bisa diulang. */
function seededRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('template', () => {
  it('5p-3s memakai siklus 7 hari dan aturan shift 2 sebelum OFF, shift 1 sesudah OFF', () => {
    expect(T3.patternLength).toBe(7);
    expect(T3.activeShifts).toEqual([1, 2, 3]);
    expect(T3.beforeOffShift).toBe(2);
    expect(T3.afterOffShift).toBe(1);
    expect(T3.shift1DailyPersonnel).toBe(1);
    expect(T3.shift3DailyPersonnel).toBe(2);
    expect(T3.preventShift3ToShift1).toBe(true);
  });

  it('5p-2s memakai siklus 5 hari, 2 shift, dan tepat 1 orang OFF per hari', () => {
    expect(T2.patternLength).toBe(5);
    expect(T2.activeShifts).toEqual([1, 2]);
    expect(T2.dailyOffPersonnel).toBe(1);
    expect(T2.shift1DailyPersonnel).toBe(2);
    expect(T2.preventShift3ToShift1).toBe(false);
  });
});

describe('hasShift3ToShift1Transition', () => {
  it('mendeteksi shift 3 diikuti shift 1', () => {
    expect(hasShift3ToShift1Transition([3, 1, 2, 2, 0, 1, 2])).toBe(true);
  });

  it('mendeteksi transisi yang melintasi ujung siklus', () => {
    // hari terakhir = 3, hari pertama = 1
    expect(hasShift3ToShift1Transition([1, 2, 2, 0, 1, 2, 3])).toBe(true);
  });

  it('mengembalikan false bila tidak ada transisi terlarang', () => {
    expect(hasShift3ToShift1Transition([1, 3, 3, 2, 0, 1, 2])).toBe(false);
  });
});

describe('validateAutoPatternRows — 5p-3s', () => {
  /** Pola valid hasil generator, dipakai sebagai basis pengujian negatif. */
  const validRows = () => generateRandomAutoPattern(null, null, T3, undefined, seededRng(7));

  it('menerima pola yang dihasilkan generator', () => {
    expect(validateAutoPatternRows(validRows(), T3)).toEqual({ isValid: true });
  });

  it('menolak bila jumlah baris bukan 5', () => {
    const rows = validRows().slice(0, 4);
    const result = validateAutoPatternRows(rows, T3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exactly 5 personnel rows');
  });

  it('menolak bila panjang baris bukan 7 hari', () => {
    const rows = validRows();
    rows[0] = rows[0].slice(0, 6);
    const result = validateAutoPatternRows(rows, T3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must contain 7 days');
  });

  it('menolak nilai shift di luar template', () => {
    const rows = validRows();
    rows[0][0] = 9;
    const result = validateAutoPatternRows(rows, T3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('invalid shift values');
  });

  it('menolak baris tanpa hari OFF', () => {
    const rows = validRows();
    const offIndex = rows[0].indexOf(0);
    rows[0][offIndex] = 2;
    const result = validateAutoPatternRows(rows, T3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exactly 1 OFF day');
  });
});

describe('createRowsFromOffDayIndexes — aturan sekitar OFF (5p-3s)', () => {
  it('menempatkan shift 2 sebelum OFF dan shift 1 sesudah OFF', () => {
    const result = createRowsFromOffDayIndexes([0, 1, 2, 3, 4], null, T3);
    expect(result.rows).not.toBeNull();

    for (const row of result.rows!) {
      const offDay = row.indexOf(0);
      const before = row[(offDay + 6) % 7];
      const after = row[(offDay + 1) % 7];
      expect(before).toBe(2);
      expect(after).toBe(1);
    }
  });

  it('memenuhi kuota harian: 1 orang shift 1 dan 2 orang shift 3', () => {
    const result = createRowsFromOffDayIndexes([0, 1, 2, 3, 4], null, T3);
    const rows = result.rows!;

    for (let day = 0; day < 7; day++) {
      expect(rows.filter((row) => row[day] === 1)).toHaveLength(1);
      expect(rows.filter((row) => row[day] === 3)).toHaveLength(2);
    }
  });

  it('tidak menghasilkan transisi shift 3 ke shift 1', () => {
    const result = createRowsFromOffDayIndexes([0, 1, 2, 3, 4], null, T3);
    for (const row of result.rows!) {
      expect(hasShift3ToShift1Transition(row)).toBe(false);
    }
  });

  it('menolak indeks hari OFF di luar rentang', () => {
    const result = createRowsFromOffDayIndexes([0, 1, 2, 3, 9], null, T3);
    expect(result.rows).toBeNull();
    expect(result.error).toContain('invalid OFF day index');
  });

  it('menolak bila OFF di hari 1 tapi hari terakhir bulan lalu bukan shift 2', () => {
    const result = createRowsFromOffDayIndexes([0, 1, 2, 3, 4], [1, 1, 1, 1, 1], T3);
    expect(result.rows).toBeNull();
    expect(result.error).toContain("previous month's last day must be shift 2");
  });
});

describe('validateBoundaryWithPreviousLastDay', () => {
  const rows = [
    [1, 2, 3, 3, 2, 0, 1],
    [1, 2, 3, 3, 2, 0, 1],
    [1, 2, 3, 3, 2, 0, 1],
    [1, 2, 3, 3, 2, 0, 1],
    [1, 2, 3, 3, 2, 0, 1],
  ];

  it('menerima bila hari terakhir bulan lalu OFF dan hari 1 adalah shift 1', () => {
    expect(validateBoundaryWithPreviousLastDay(rows, [0, 0, 0, 0, 0], T3).isValid).toBe(true);
  });

  it('menolak bila hari terakhir bulan lalu OFF tapi hari 1 bukan shift 1', () => {
    const bad = rows.map((row) => [...row]);
    bad[0][0] = 2;
    const result = validateBoundaryWithPreviousLastDay(bad, [0, 0, 0, 0, 0], T3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('day 1 must be shift 1');
  });

  it('menolak perpindahan shift 3 (hari terakhir bulan lalu) ke shift 1 (hari 1)', () => {
    const result = validateBoundaryWithPreviousLastDay(rows, [3, 0, 0, 0, 0], T3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must not move from shift 3');
  });
});

describe('5p-2s — rotasi harian', () => {
  it('membentuk pola valid dari urutan OFF harian dengan rotasi 1122OFF', () => {
    const result = createRowsFromDailyOffUserIndexes(
      [0, 1, 2, 3, 4],
      T2,
      TWO_SHIFT_ROTATION_PATTERNS['1122-off'],
    );
    expect(result.rows).not.toBeNull();
    expect(validateAutoPatternRows(result.rows!, T2)).toEqual({ isValid: true });
  });

  it('memastikan tepat 1 orang OFF dan 2 orang shift 1 setiap hari', () => {
    const rows = createRowsFromDailyOffUserIndexes(
      [0, 1, 2, 3, 4],
      T2,
      TWO_SHIFT_ROTATION_PATTERNS['2211-off'],
    ).rows!;

    for (let day = 0; day < T2.patternLength; day++) {
      expect(rows.filter((row) => row[day] === 0)).toHaveLength(1);
      expect(rows.filter((row) => row[day] === 1)).toHaveLength(2);
      expect(rows.filter((row) => row[day] === 2)).toHaveLength(2);
    }
  });

  it('menolak panjang urutan OFF yang tidak sesuai template', () => {
    const result = createRowsFromDailyOffUserIndexes([0, 1, 2], T2);
    expect(result.rows).toBeNull();
    expect(result.error).toContain('must contain 5 days');
  });

  it('melanjutkan giliran OFF dari personel terakhir bulan lalu', () => {
    // Personel index 2 OFF terakhir → bulan ini mulai dari index 3.
    expect(generateDailyOffUserIndexes(2)).toEqual([3, 4, 0, 1, 2]);
  });
});

describe('generateRandomAutoPattern', () => {
  it('menghasilkan pola 5p-3s yang lolos semua aturan (beberapa seed)', () => {
    for (const seed of [1, 42, 123, 999, 20260805]) {
      const rows = generateRandomAutoPattern(null, null, T3, undefined, seededRng(seed));
      expect(validateAutoPatternRows(rows, T3)).toEqual({ isValid: true });
    }
  });

  it('menghasilkan pola 5p-2s yang lolos semua aturan', () => {
    const rows = generateRandomAutoPattern(
      null,
      null,
      T2,
      TWO_SHIFT_ROTATION_PATTERNS['1122-off'],
      seededRng(5),
    );
    expect(validateAutoPatternRows(rows, T2)).toEqual({ isValid: true });
  });

  it('melempar AutoAssignError bila hari OFF yang dipaksakan mustahil dipenuhi', () => {
    // Semua personel OFF di hari yang sama → kuota harian tidak mungkin terpenuhi.
    expect(() => generateRandomAutoPattern(null, [0, 0, 0, 0, 0], T3)).toThrow(AutoAssignError);
  });
});

describe('derangeUsers', () => {
  const users = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
    { id: 'd', name: 'D' },
    { id: 'e', name: 'E' },
  ];

  it('tidak ada personel yang tetap di posisi semula', () => {
    const result = derangeUsers(users, null, seededRng(11));
    expect(result).not.toBeNull();
    result!.forEach((user, index) => {
      expect(user.id).not.toBe(users[index].id);
    });
  });

  it('mengembalikan null bila personel kurang dari 2', () => {
    expect(derangeUsers([users[0]])).toBeNull();
  });

  it('menghindari pemberian pola yang isinya sama dengan pola lama personel', () => {
    // Dua pola pertama identik: personel 0 dan 1 tidak boleh saling bertukar.
    const patternRows = [
      [1, 2, 3, 3, 2, 0, 1],
      [1, 2, 3, 3, 2, 0, 1],
      [2, 0, 1, 3, 3, 2, 1],
      [3, 3, 2, 0, 1, 2, 1],
      [2, 1, 1, 2, 3, 3, 0],
    ];
    const result = derangeUsers(users, patternRows, seededRng(3));
    expect(result).not.toBeNull();

    result!.forEach((user, patternIndex) => {
      const originalIndex = users.findIndex((u) => u.id === user.id);
      expect(originalIndex).not.toBe(patternIndex);
      expect(arePatternsEqual(patternRows[patternIndex], patternRows[originalIndex])).toBe(false);
    });
  });
});

describe('getNextOffDayIndexes', () => {
  it('menghitung hari OFF berikutnya dengan siklus 7 hari', () => {
    // OFF terakhir tanggal 30 dari bulan 30 hari → jarak 0 → OFF berikutnya hari ke-7 (indeks 6).
    expect(getNextOffDayIndexes([{ last_off_day: 30 }], 30)).toEqual([6]);
    // OFF terakhir tanggal 29 → jarak 1 → OFF berikutnya hari ke-6 (indeks 5).
    expect(getNextOffDayIndexes([{ last_off_day: 29 }], 30)).toEqual([5]);
    // OFF terakhir tanggal 24 → jarak 6 → OFF berikutnya hari ke-1 (indeks 0).
    expect(getNextOffDayIndexes([{ last_off_day: 24 }], 30)).toEqual([0]);
  });
});

describe('validateFirstOffDays', () => {
  const users = [{ name: 'Budi' }, { name: 'Sari' }];

  it('menerima bila hari OFF sesuai perhitungan', () => {
    const rows = [
      [1, 2, 0, 1, 2, 3, 3],
      [0, 1, 2, 3, 3, 2, 1],
    ];
    expect(validateFirstOffDays(rows, [2, 0], users).isValid).toBe(true);
  });

  it('menyebut nama personel saat hari OFF meleset', () => {
    const rows = [
      [1, 2, 0, 1, 2, 3, 3],
      [0, 1, 2, 3, 3, 2, 1],
    ];
    const result = validateFirstOffDays(rows, [2, 3], users);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Sari');
  });
});

describe('fillRemainingShifts', () => {
  it('mengisi sel kosong sehingga kuota harian terpenuhi', () => {
    const rows: (number | null)[][] = [
      [null, null, 2, 0, 1, null, null],
      [1, null, null, 2, 0, 1, null],
      [null, 1, null, null, 2, 0, 1],
      [1, null, 1, null, null, 2, 0],
      [0, 1, null, 1, null, null, 2],
    ];
    const result = fillRemainingShifts(rows);
    expect(result.isValid).toBe(true);
    expect(rows.every((row) => row.every((cell) => cell !== null))).toBe(true);

    for (let day = 0; day < 7; day++) {
      expect(rows.filter((row) => row[day] === 1)).toHaveLength(1);
      expect(rows.filter((row) => row[day] === 3)).toHaveLength(2);
    }
  });

  it('gagal secara terkendali bila kuota mustahil dipenuhi', () => {
    // Empat orang sudah shift 1 di hari yang sama, melebihi kuota 1 orang.
    const rows: (number | null)[][] = [
      [1, null, null, null, null, null, null],
      [1, null, null, null, null, null, null],
      [1, null, null, null, null, null, null],
      [1, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
    ];
    expect(fillRemainingShifts(rows).isValid).toBe(false);
  });
});

describe('utilitas', () => {
  it('shuffleArray tidak mengubah array asli dan mempertahankan anggotanya', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original, seededRng(9));
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('toShiftNumberPattern memetakan id shift ke nomor shift dan menjaga OFF', () => {
    expect(toShiftNumberPattern([0, 11, 22, 33], { 11: 1, 22: 2, 33: 3 })).toEqual([0, 1, 2, 3]);
  });

  it('toShiftNumberPattern menghasilkan null untuk id yang tak dikenal', () => {
    expect(toShiftNumberPattern([99], { 11: 1 })).toEqual([null]);
  });

  it('formatDateString merakit tanggal tanpa terpengaruh timezone', () => {
    expect(formatDateString(2026, 1, 5)).toBe('2026-01-05');
    expect(formatDateString(2026, 12, 31)).toBe('2026-12-31');
  });

  it('daysInMonth benar termasuk Februari tahun kabisat', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(31);
  });

  it('getPreviousMonthInfo menangani pergantian tahun', () => {
    expect(getPreviousMonthInfo(2026, 1)).toEqual({
      previousMonth: '2025-12-01',
      previousDays: 31,
    });
    expect(getPreviousMonthInfo(2026, 3)).toEqual({
      previousMonth: '2026-02-01',
      previousDays: 28,
    });
  });
});
