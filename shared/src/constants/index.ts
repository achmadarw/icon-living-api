export const AUTH = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  REFRESH_TOKEN_EXPIRES_IN_MS: 30 * 24 * 60 * 60 * 1000,
  BCRYPT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

export const ROLES = {
  PENGURUS: ['BENDAHARA', 'KETUA'] as const,
  ALL: ['WARGA', 'BENDAHARA', 'KETUA'] as const,
} as const;
