import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { config } from '../config';

// Minimal console-based logger (project tidak punya pino/winston wrapper terpusat)
const logger = {
  info: (...args: unknown[]) => console.info('[info]', ...args),
  warn: (...args: unknown[]) => console.warn('[warn]', ...args),
  error: (...args: unknown[]) => console.error('[error]', ...args),
};

let firebaseApp: App | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase Admin SDK.
 *
 * If the required env vars (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)
 * are not provided, the SDK is **not** initialized and FCM pushes are silently
 * skipped. This lets the API keep running in test / local envs without
 * Firebase credentials configured.
 */
export function initFirebase(): void {
  if (firebaseApp) return;

  if (!config.firebase.enabled) {
    logger.warn(
      '[firebase] FCM disabled — missing FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY',
    );
    return;
  }

  try {
    const existing = getApps();
    firebaseApp =
      existing.length > 0
        ? existing[0]!
        : initializeApp({
            credential: cert({
              projectId: config.firebase.projectId!,
              clientEmail: config.firebase.clientEmail!,
              privateKey: config.firebase.privateKey!,
            }),
          });

    messaging = getMessaging(firebaseApp);
    logger.info('[firebase] Admin SDK initialized');
  } catch (err) {
    logger.error({ err }, '[firebase] Failed to initialize Admin SDK');
    firebaseApp = null;
    messaging = null;
  }
}

export function getFirebaseMessaging(): Messaging | null {
  return messaging;
}

export function isFirebaseReady(): boolean {
  return messaging !== null;
}

export interface FcmPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to one or more device tokens.
 * Returns the list of **invalid tokens** that should be removed from DB.
 */
export async function sendFcmToTokens(
  tokens: string[],
  payload: FcmPushPayload,
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  const result = { successCount: 0, failureCount: 0, invalidTokens: [] as string[] };

  if (!messaging || tokens.length === 0) {
    return result;
  }

  // Deduplicate tokens
  const uniqueTokens = [...new Set(tokens)];

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'tia_default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    result.successCount = response.successCount;
    result.failureCount = response.failureCount;

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        // Invalid / unregistered tokens should be removed from DB
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          result.invalidTokens.push(uniqueTokens[idx]!);
        } else {
          logger.warn({ code, token: uniqueTokens[idx] }, '[firebase] FCM send error');
        }
      }
    });
  } catch (err) {
    logger.error({ err }, '[firebase] sendEachForMulticast failed');
    result.failureCount = uniqueTokens.length;
  }

  return result;
}
