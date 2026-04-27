import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize } from '../../middleware/authorize';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors';

describe('authorize middleware', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    res = {} as Response;
    next = vi.fn();
  });

  it('should call next() for allowed role', () => {
    const req = { user: { userId: 'user-1', role: 'KETUA' } } as Request;
    const middleware = authorize('KETUA', 'BENDAHARA');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with ForbiddenError for disallowed role', () => {
    const req = { user: { userId: 'user-1', role: 'WARGA' } } as Request;
    const middleware = authorize('KETUA', 'BENDAHARA');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should call next with UnauthorizedError when no user on request', () => {
    const req = {} as Request;
    const middleware = authorize('WARGA');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should allow single role check', () => {
    const req = { user: { userId: 'user-1', role: 'WARGA' } } as Request;
    const middleware = authorize('WARGA');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should allow all roles when all three are specified', () => {
    const middleware = authorize('WARGA', 'BENDAHARA', 'KETUA');

    for (const role of ['WARGA', 'BENDAHARA', 'KETUA']) {
      const localNext = vi.fn();
      const req = { user: { userId: 'user-1', role } } as Request;
      middleware(req, res, localNext);
      expect(localNext).toHaveBeenCalledWith();
    }
  });
});
