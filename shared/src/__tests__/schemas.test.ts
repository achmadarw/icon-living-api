import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  refreshTokenSchema,
  fcmTokenSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  resetPasswordSchema,
  createPaymentTypeSchema,
  updatePaymentTypeSchema,
  createPaymentSchema,
  reviewPaymentSchema,
  rejectPaymentSchema,
  paymentQuerySchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  expenseQuerySchema,
  paginationSchema,
  idParamSchema,
} from '../schemas';

// ─── Auth Schemas ────────────────────────────────────────

describe('loginSchema', () => {
  it('should validate correct login input', () => {
    const result = loginSchema.safeParse({ username: 'warga1', password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('should accept optional fcmToken', () => {
    const result = loginSchema.safeParse({ username: 'warga1', password: '12345678', fcmToken: 'token123' });
    expect(result.success).toBe(true);
  });

  it('should reject username shorter than 3 characters', () => {
    const result = loginSchema.safeParse({ username: 'ab', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('should reject username with spaces', () => {
    const result = loginSchema.safeParse({ username: 'user name', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('should reject username with uppercase letters', () => {
    const result = loginSchema.safeParse({ username: 'UserName', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({ username: 'warga1', password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('should reject empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: '12345678' });
    expect(result.success).toBe(false);
  });
});

describe('refreshTokenSchema', () => {
  it('should validate correct refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token' });
    expect(result.success).toBe(true);
  });

  it('should reject empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});

describe('fcmTokenSchema', () => {
  it('should validate correct FCM token input', () => {
    const result = fcmTokenSchema.safeParse({ token: 'fcm-token', platform: 'ANDROID' });
    expect(result.success).toBe(true);
  });

  it('should accept all valid platforms', () => {
    for (const platform of ['ANDROID', 'IOS', 'WEB']) {
      const result = fcmTokenSchema.safeParse({ token: 'token', platform });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid platform', () => {
    const result = fcmTokenSchema.safeParse({ token: 'token', platform: 'WINDOWS' });
    expect(result.success).toBe(false);
  });
});

// ─── User Schemas ────────────────────────────────────────

describe('createUserSchema', () => {
  const validUser = {
    name: 'Budi Santoso',
    username: 'budi_santoso',
    password: '12345678',
    role: 'WARGA',
  };

  it('should validate correct user creation input', () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should accept optional fields', () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      phone: '081234567890',
      unitNumber: 'A-01',
      address: 'Blok A No. 1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('should reject name shorter than 2 characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('should reject username with special characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, username: 'budi@santoso' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid roles', () => {
    for (const role of ['WARGA', 'BENDAHARA', 'KETUA']) {
      const result = createUserSchema.safeParse({ ...validUser, role });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateUserSchema', () => {
  it('should accept partial updates', () => {
    const result = updateUserSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (no updates)', () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('updateProfileSchema', () => {
  it('should validate profile update', () => {
    const result = updateProfileSchema.safeParse({ name: 'New Name', phone: '081234567890' });
    expect(result.success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('should validate correct password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newpass123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: '1234567',
    });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('should validate correct reset password input', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: 'newpass123' });
    expect(result.success).toBe(true);
  });

  it('should reject short password', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: '123' });
    expect(result.success).toBe(false);
  });
});

// ─── Payment Type Schemas ────────────────────────────────

describe('createPaymentTypeSchema', () => {
  it('should validate correct payment type creation', () => {
    const result = createPaymentTypeSchema.safeParse({ name: 'IPL', fixedAmount: 250000, isMandatory: true });
    expect(result.success).toBe(true);
  });

  it('should accept null fixedAmount for flexible payment', () => {
    const result = createPaymentTypeSchema.safeParse({ name: 'Lainnya', fixedAmount: null });
    expect(result.success).toBe(true);
  });

  it('should default isMandatory to false', () => {
    const result = createPaymentTypeSchema.safeParse({ name: 'Parkir' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isMandatory).toBe(false);
    }
  });

  it('should reject empty name', () => {
    const result = createPaymentTypeSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject negative fixedAmount', () => {
    const result = createPaymentTypeSchema.safeParse({ name: 'Test', fixedAmount: -1000 });
    expect(result.success).toBe(false);
  });
});

describe('updatePaymentTypeSchema', () => {
  it('should accept partial updates', () => {
    const result = updatePaymentTypeSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });
});

// ─── Payment Schemas ─────────────────────────────────────

describe('createPaymentSchema', () => {
  const validPayment = {
    paymentTypeId: 'clx123',
    amount: 250000,
    bankName: 'BCA',
    transferDate: '2026-04-18T10:00:00.000Z',
    proofImageUrl: 'https://storage.example.com/proof.jpg',
    periods: ['2026-04'],
  };

  it('should validate correct payment creation', () => {
    const result = createPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it('should accept multiple periods', () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, periods: ['2026-01', '2026-02'] });
    expect(result.success).toBe(true);
  });

  it('should reject invalid period format', () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, periods: ['04-2026'] });
    expect(result.success).toBe(false);
  });

  it('should reject empty periods array', () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, periods: [] });
    expect(result.success).toBe(false);
  });

  it('should reject zero amount', () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, amount: -50000 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid proof URL', () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, proofImageUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('should reject more than 12 periods', () => {
    const periods = Array.from({ length: 13 }, (_, i) =>
      `2026-${String(i + 1).padStart(2, '0')}`
    );
    // 13th period is invalid format "2026-13", but let's test max with valid ones
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      periods: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
                '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'],
    });
    expect(result.success).toBe(false);
  });
});

describe('reviewPaymentSchema', () => {
  it('should accept empty review (approve)', () => {
    const result = reviewPaymentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept note with review', () => {
    const result = reviewPaymentSchema.safeParse({ note: 'Approved, terima kasih' });
    expect(result.success).toBe(true);
  });
});

describe('rejectPaymentSchema', () => {
  it('should require rejection note', () => {
    const result = rejectPaymentSchema.safeParse({ note: 'Bukti tidak valid' });
    expect(result.success).toBe(true);
  });

  it('should reject empty note', () => {
    const result = rejectPaymentSchema.safeParse({ note: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing note', () => {
    const result = rejectPaymentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('paymentQuerySchema', () => {
  it('should use defaults for empty query', () => {
    const result = paymentQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should coerce string numbers from query params', () => {
    const result = paymentQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject limit over 100', () => {
    const result = paymentQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('should accept valid status filter', () => {
    const result = paymentQuerySchema.safeParse({ status: 'PENDING' });
    expect(result.success).toBe(true);
  });
});

// ─── Expense Category Schemas ────────────────────────────

describe('createExpenseCategorySchema', () => {
  it('should validate correct category creation', () => {
    const result = createExpenseCategorySchema.safeParse({
      name: 'Kebersihan',
      requiresApproval: false,
    });
    expect(result.success).toBe(true);
  });

  it('should default requiresApproval to true', () => {
    const result = createExpenseCategorySchema.safeParse({ name: 'Lainnya' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresApproval).toBe(true);
    }
  });
});

// ─── Expense Schemas ─────────────────────────────────────

describe('createExpenseSchema', () => {
  const validExpense = {
    categoryId: 'clx123',
    amount: 500000,
    description: 'Biaya pembersihan area taman bulan April',
  };

  it('should validate correct expense creation', () => {
    const result = createExpenseSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it('should reject description shorter than 10 characters', () => {
    const result = createExpenseSchema.safeParse({ ...validExpense, description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('should accept optional attachment URL', () => {
    const result = createExpenseSchema.safeParse({
      ...validExpense,
      attachmentUrl: 'https://storage.example.com/nota.jpg',
    });
    expect(result.success).toBe(true);
  });
});

describe('approveExpenseSchema', () => {
  it('should accept empty approval', () => {
    const result = approveExpenseSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('rejectExpenseSchema', () => {
  it('should require rejection note', () => {
    const result = rejectExpenseSchema.safeParse({ note: 'Budget tidak tersedia' });
    expect(result.success).toBe(true);
  });

  it('should reject empty note', () => {
    const result = rejectExpenseSchema.safeParse({ note: '' });
    expect(result.success).toBe(false);
  });
});

describe('expenseQuerySchema', () => {
  it('should use defaults for empty query', () => {
    const result = expenseQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept valid status filter', () => {
    const result = expenseQuerySchema.safeParse({ status: 'DRAFT' });
    expect(result.success).toBe(true);
  });
});

// ─── Common Schemas ──────────────────────────────────────

describe('paginationSchema', () => {
  it('should use defaults for empty input', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should reject zero page', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject negative limit', () => {
    const result = paginationSchema.safeParse({ limit: -1 });
    expect(result.success).toBe(false);
  });
});

describe('idParamSchema', () => {
  it('should validate non-empty id', () => {
    const result = idParamSchema.safeParse({ id: 'clx123abc' });
    expect(result.success).toBe(true);
  });

  it('should reject empty id', () => {
    const result = idParamSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});
