import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { UnauthorizedError } from '../../utils/errors';

vi.mock('../../lib/jwt', () => ({
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'valid-token') {
      return { userId: 'user-123', role: 'WARGA' };
    }
    throw new Error('Invalid token');
  }),
}));

function createMockRequest(authHeader?: string): Request {
  return {
    headers: {
      authorization: authHeader,
    },
  } as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('authenticate middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should set req.user for valid token', () => {
    const req = createMockRequest('Bearer valid-token');
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(req.user).toEqual({ userId: 'user-123', role: 'WARGA' });
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with UnauthorizedError when no auth header', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with UnauthorizedError when auth header is not Bearer', () => {
    const req = createMockRequest('Basic abc123');
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with UnauthorizedError when token is invalid', () => {
    const req = createMockRequest('Bearer invalid-token');
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with UnauthorizedError when Bearer has no token', () => {
    const req = createMockRequest('Bearer ');
    const res = createMockResponse();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
