import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (!fields[path]) {
        fields[path] = issue.message;
      }
    }
    return sendError(res, 400, 'VALIDATION_ERROR', 'Data tidak valid', { fields });
  }

  // Unexpected errors — log but don't expose internals
  console.error('Unhandled error:', err);

  return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server');
}
