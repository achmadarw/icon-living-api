import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

describe('validate middleware', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    next = vi.fn();
  });

  const testSchema = z.object({
    name: z.string().min(2),
    age: z.number().int().positive(),
  });

  it('should call next() for valid body', () => {
    const req = { body: { name: 'Budi', age: 25 } } as Request;
    const middleware = validate(testSchema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Budi', age: 25 });
  });

  it('should replace body with parsed data (strips extra fields)', () => {
    const req = { body: { name: 'Budi', age: 25, extra: 'field' } } as Request;
    const middleware = validate(testSchema);

    middleware(req, res, next);

    expect(req.body).toEqual({ name: 'Budi', age: 25 });
  });

  it('should return 400 for invalid body', () => {
    const req = { body: { name: 'A', age: -1 } } as Request;
    const middleware = validate(testSchema);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate query params when source is query', () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
    });
    const req = { query: { page: '2' } } as unknown as Request;
    const middleware = validate(querySchema, 'query');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 2 });
  });

  it('should validate params when source is params', () => {
    const paramsSchema = z.object({
      id: z.string().min(1),
    });
    const req = { params: { id: 'abc123' } } as unknown as Request;
    const middleware = validate(paramsSchema, 'params');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should return field-level error details', () => {
    const req = { body: { name: '', age: 'not-a-number' } } as Request;
    const middleware = validate(testSchema);

    middleware(req, res, next);

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.error.details).toBeDefined();
    expect(jsonCall.error.details.fields).toBeDefined();
  });
});
