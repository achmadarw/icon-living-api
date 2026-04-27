import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  // Firebase Admin SDK (FCM Push Notification) — optional; jika kosong, push dinonaktifkan
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
});


function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment variables:\n${formatted}`);
  }

  const env = parsed.data;

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresIn: '15m' as const,
      refreshExpiresIn: '30d' as const,
    },
    cors: {
      origins: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    },
    firebase: {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines (\n) and strip optional surrounding quotes that .env parsers may keep
      privateKey: env.FIREBASE_PRIVATE_KEY
        ? env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
        : undefined,
      enabled: Boolean(
        env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY,
      ),
    },
  } as const;
}


export type Config = ReturnType<typeof loadConfig>;

export const config = loadConfig();
