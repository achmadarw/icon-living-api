"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.UPLOAD = exports.PAGINATION = exports.AUTH = void 0;
exports.AUTH = {
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '30d',
    REFRESH_TOKEN_EXPIRES_IN_MS: 30 * 24 * 60 * 60 * 1000,
    BCRYPT_ROUNDS: 12,
    MIN_PASSWORD_LENGTH: 8,
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 50,
};
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.UPLOAD = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};
exports.ROLES = {
    PENGURUS: ['BENDAHARA', 'KETUA'],
    ALL: ['WARGA', 'BENDAHARA', 'KETUA'],
};
//# sourceMappingURL=index.js.map