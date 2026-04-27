import type { Response } from 'express';
import type { PaginationMeta } from '@tia/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T) {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const body: Record<string, unknown> = {
    success: false,
    error: { code, message },
  };
  if (details) {
    (body.error as Record<string, unknown>).details = details;
  }
  return res.status(statusCode).json(body);
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
