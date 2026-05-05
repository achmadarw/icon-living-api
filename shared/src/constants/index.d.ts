export declare const AUTH: {
    readonly ACCESS_TOKEN_EXPIRES_IN: "15m";
    readonly REFRESH_TOKEN_EXPIRES_IN: "30d";
    readonly REFRESH_TOKEN_EXPIRES_IN_MS: number;
    readonly BCRYPT_ROUNDS: 12;
    readonly MIN_PASSWORD_LENGTH: 8;
    readonly MIN_USERNAME_LENGTH: 3;
    readonly MAX_USERNAME_LENGTH: 50;
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const UPLOAD: {
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
};
export declare const ROLES: {
    readonly PENGURUS: readonly ["BENDAHARA", "KETUA"];
    readonly ALL: readonly ["WARGA", "BENDAHARA", "KETUA"];
};
