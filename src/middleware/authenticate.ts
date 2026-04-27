import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { UnauthorizedError } from '../utils/errors';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token tidak ditemukan'));
  }

  const token = authHeader.slice(7);

  if (!token) {
    return next(new UnauthorizedError('Token tidak ditemukan'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Token tidak valid atau sudah kadaluarsa'));
  }
}
