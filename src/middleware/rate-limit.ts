import rateLimit from 'express-rate-limit';

/** General API rate limit — 100 req/min per IP */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Terlalu banyak request. Coba lagi nanti.' },
  },
});

/** Auth endpoints rate limit — 10 req/15min per IP */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  },
});

/** Export endpoints rate limit — 10 req/min per IP (prevent abuse) */
export const exportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan export. Coba lagi nanti.' },
  },
});
