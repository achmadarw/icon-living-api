import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './lib/swagger';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit';
import { sanitize } from './middleware/sanitize';
import { errorHandler } from './middleware/error-handler';
import routes from './routes';
import path from 'path';  

export function createApp(): Express {
  const app = express();

  // ─── Security ────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow Swagger UI inline scripts
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ─── Parsing ─────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Input Sanitization ──────────────────────────────
  app.use(sanitize);

  // ─── Rate Limiting ───────────────────────────────────
  if (!config.isTest) {
    app.use('/v1', apiRateLimit);
    app.use('/v1/auth', authRateLimit);
  }

  // ─── API Docs ────────────────────────────────────────
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ─── Routes ──────────────────────────────────────────
  app.use('/v1', routes);

  // ─── Error Handler (must be last) ────────────────────
  app.use(errorHandler);

  // ─── Static Files (uploads) ──────────────────────── ← TAMBAH INI
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  return app;
}
