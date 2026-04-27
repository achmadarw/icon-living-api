import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

type ValidationSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info(`📋 VALIDATING ${source.toUpperCase()}`);
    logger.step(1, `Request ${source}`, req[source]);

    const result = schema.safeParse(req[source]);

    if (!result.success) {
      logger.warn(`Validation failed for ${source}`, {
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });

      const details = formatZodErrors(result.error);
      return sendError(res, 400, 'VALIDATION_ERROR', 'Data tidak valid', details);
    }

    logger.step(2, `Validation passed for ${source}`);
    req[source] = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, unknown> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }

  return { fields };
}
