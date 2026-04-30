import type { ErrorCode } from '@tia/shared';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Akses tidak diizinkan') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki akses ke resource ini') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', message?: string) {
    super(404, 'NOT_FOUND', message ?? `${resource} tidak ditemukan`);
  }
}

export class DuplicateError extends AppError {
  constructor(field: string) {
    super(409, 'DUPLICATE', `${field} sudah terdaftar`);
  }
}

export class DuplicateUnitError extends AppError {
  constructor() {
    super(409, 'DUPLICATE_UNIT', 'Unit sudah terdaftar');
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super(400, 'INSUFFICIENT_BALANCE', 'Saldo kas tidak mencukupi');
  }
}

export class InvalidStatusError extends AppError {
  constructor(currentStatus: string, expectedStatus: string) {
    super(400, 'INVALID_STATUS', `Status saat ini '${currentStatus}', diharapkan '${expectedStatus}'`);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, 'RATE_LIMIT', 'Terlalu banyak request. Coba lagi nanti.');
  }
}

export class LoginAttemptsExceededError extends AppError {
  constructor(remainingSeconds: number) {
    const minutes = Math.ceil(remainingSeconds / 60);
    super(
      429,
      'RATE_LIMIT',
      `Terlalu banyak percobaan login. Coba lagi dalam ${minutes} menit.`,
      { remainingSeconds, retryAfter: remainingSeconds }
    );
  }
}
