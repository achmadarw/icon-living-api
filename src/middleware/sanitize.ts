import type { Request, Response, NextFunction } from 'express';

/**
 * Input sanitization middleware.
 * Strips potentially dangerous content from request body strings
 * to prevent XSS and injection attacks.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/** Strip HTML tags and trim whitespace from a string value. */
function sanitizeString(value: string): string {
  return value
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
    .trim();
}
