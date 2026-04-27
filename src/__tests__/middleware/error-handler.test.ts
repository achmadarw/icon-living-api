import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorHandler } from '../../middleware/error-handler';
import { AppError, NotFoundError, ValidationError } from '../../utils/errors';

describe('errorHandler middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    next = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle AppError with correct status', () => {
    const error = new NotFoundError('Payment');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Payment tidak ditemukan',
      },
    });
  });

  it('should handle ValidationError', () => {
    const error = new ValidationError('Data tidak valid', { field: 'name' });

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.error.code).toBe('VALIDATION_ERROR');
    expect(jsonCall.error.details).toEqual({ field: 'name' });
  });

  it('should handle ZodError as validation error', () => {
    const schema = z.object({ name: z.string().min(2) });
    let zodError: ZodError;
    try {
      schema.parse({ name: '' });
      throw new Error('Should not reach here');
    } catch (e) {
      zodError = e as ZodError;
    }

    errorHandler(zodError!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.error.code).toBe('VALIDATION_ERROR');
    expect(jsonCall.error.details?.fields).toBeDefined();
  });

  it('should handle unknown errors as 500', () => {
    const error = new Error('Something unexpected');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    });
  });

  it('should log unexpected errors', () => {
    const error = new Error('Unexpected crash');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Unhandled error:', error);
  });

  it('should not log AppErrors', () => {
    const error = new AppError(400, 'VALIDATION_ERROR', 'test');

    errorHandler(error, req, res, next);

    expect(console.error).not.toHaveBeenCalled();
  });
});
