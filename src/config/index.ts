import { z } from 'zod';

const booleanEnv = z.preprocess((value) => {
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  APP_URL: z.string().url().optional(),
  UPLOAD_DIR: z.string().default('uploads'),
  // Firebase Admin SDK (FCM Push Notification) — optional; jika kosong, push dinonaktifkan
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  MOBILE_ANDROID_LATEST_VERSION: z.string().default('1.0.0'),
  MOBILE_ANDROID_LATEST_BUILD: z.coerce.number().int().positive().default(5),
  MOBILE_ANDROID_MINIMUM_BUILD: z.coerce.number().int().positive().default(1),
  MOBILE_ANDROID_FORCE_UPDATE: booleanEnv.default(false),
  MOBILE_ANDROID_PLAY_STORE_URL: z
    .string()
    .url()
    .default('https://play.google.com/store/apps/details?id=com.tia.acropolis.tia_mobile'),
  MOBILE_ANDROID_UPDATE_MESSAGE: z
    .string()
    .default('Versi baru tersedia. Silakan update aplikasi untuk mendapatkan perbaikan terbaru.'),
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
    appUrl: env.APP_URL,
    upload: {
      dir: env.UPLOAD_DIR,
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
    mobile: {
      android: {
        latestVersion: env.MOBILE_ANDROID_LATEST_VERSION,
        latestBuildNumber: env.MOBILE_ANDROID_LATEST_BUILD,
        minimumBuildNumber: env.MOBILE_ANDROID_MINIMUM_BUILD,
        forceUpdate: env.MOBILE_ANDROID_FORCE_UPDATE,
        playStoreUrl: env.MOBILE_ANDROID_PLAY_STORE_URL,
        message: env.MOBILE_ANDROID_UPDATE_MESSAGE,
      },
    },
  } as const;
}


export type Config = ReturnType<typeof loadConfig>;

export const config = loadConfig();
