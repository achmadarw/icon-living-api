import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  DuplicateError,
  DuplicateUnitError,
  InsufficientBalanceError,
  InvalidStatusError,
  RateLimitError,
} from '../../utils/errors';

describe('AppError', () => {
  it('should create an error with correct properties', () => {
    const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid data', { field: 'name' });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid data');
    expect(error.details).toEqual({ field: 'name' });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should work without details', () => {
    const error = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
    expect(error.details).toBeUndefined();
  });
});

describe('ValidationError', () => {
  it('should create a 400 VALIDATION_ERROR', () => {
    const error = new ValidationError('Field is required');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Field is required');
  });
});

describe('UnauthorizedError', () => {
  it('should create a 401 UNAUTHORIZED with default message', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Akses tidak diizinkan');
  });

  it('should accept custom message', () => {
    const error = new UnauthorizedError('Token expired');
    expect(error.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('should create a 403 FORBIDDEN with default message', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

describe('NotFoundError', () => {
  it('should create a 404 NOT_FOUND with resource name', () => {
    const error = new NotFoundError('User');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('User tidak ditemukan');
  });

  it('should use default resource name', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource tidak ditemukan');
  });

  it('should accept custom message', () => {
    const error = new NotFoundError('Payment', 'Pembayaran dengan ID tersebut tidak ada');
    expect(error.message).toBe('Pembayaran dengan ID tersebut tidak ada');
  });
});

describe('DuplicateError', () => {
  it('should create a 409 DUPLICATE', () => {
    const error = new DuplicateError('Username');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DUPLICATE');
    expect(error.message).toBe('Username sudah terdaftar');
  });
});

describe('DuplicateUnitError', () => {
  it('should create a 409 DUPLICATE_UNIT', () => {
    const error = new DuplicateUnitError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DUPLICATE_UNIT');
    expect(error.message).toBe('Unit sudah terdaftar');
  });
});

describe('InsufficientBalanceError', () => {
  it('should create a 400 INSUFFICIENT_BALANCE', () => {
    const error = new InsufficientBalanceError();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('INSUFFICIENT_BALANCE');
  });
});

describe('InvalidStatusError', () => {
  it('should format status message correctly', () => {
    const error = new InvalidStatusError('DRAFT', 'SUBMITTED');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('INVALID_STATUS');
    expect(error.message).toContain('DRAFT');
    expect(error.message).toContain('SUBMITTED');
  });
});

describe('RateLimitError', () => {
  it('should create a 429 RATE_LIMIT', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT');
  });
});
