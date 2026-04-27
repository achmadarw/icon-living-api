process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/tia_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters-long-for-testing';
process.env.CORS_ORIGINS = 'http://localhost:3000';
