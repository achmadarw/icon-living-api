/**
 * Login Attempts Service
 * Tracks failed login attempts per USERNAME (not IP)
 * Implements rate limiting on a per-user basis
 */

interface LoginAttempt {
  username: string;
  attempts: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store for tracking failed attempts per username
const loginAttempts = new Map<string, LoginAttempt>();

export class LoginAttemptsService {
  /**
   * Check if username is currently locked out
   * @returns null if not locked, otherwise returns remaining lockout time in seconds
   */
  static isLockedOut(username: string): number | null {
    const attempt = loginAttempts.get(username);
    if (!attempt) return null;

    const now = Date.now();
    const timeSinceFirstAttempt = now - attempt.firstAttemptTime;

    // If lockout period has expired, clear the record
    if (timeSinceFirstAttempt > LOCKOUT_DURATION_MS) {
      loginAttempts.delete(username);
      return null;
    }

    // If still within lockout window and max attempts exceeded
    if (attempt.attempts >= MAX_FAILED_ATTEMPTS) {
      const remainingMs = LOCKOUT_DURATION_MS - timeSinceFirstAttempt;
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return remainingSeconds;
    }

    return null;
  }

  /**
   * Record a failed login attempt
   */
  static recordFailedAttempt(username: string): void {
    const now = Date.now();
    const attempt = loginAttempts.get(username);

    if (attempt) {
      // Reset if lockout period has passed
      if (now - attempt.firstAttemptTime > LOCKOUT_DURATION_MS) {
        loginAttempts.set(username, {
          username,
          attempts: 1,
          firstAttemptTime: now,
          lastAttemptTime: now,
        });
      } else {
        // Increment existing attempt
        attempt.attempts += 1;
        attempt.lastAttemptTime = now;
      }
    } else {
      // First failed attempt
      loginAttempts.set(username, {
        username,
        attempts: 1,
        firstAttemptTime: now,
        lastAttemptTime: now,
      });
    }
  }

  /**
   * Clear failed attempts for a user (called on successful login)
   */
  static clearAttempts(username: string): void {
    loginAttempts.delete(username);
  }

  /**
   * Get current attempt count for a username
   */
  static getAttemptCount(username: string): number {
    const attempt = loginAttempts.get(username);
    if (!attempt) return 0;

    const now = Date.now();
    if (now - attempt.firstAttemptTime > LOCKOUT_DURATION_MS) {
      loginAttempts.delete(username);
      return 0;
    }

    return attempt.attempts;
  }

  /**
   * Cleanup expired entries (call periodically)
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [username, attempt] of loginAttempts.entries()) {
      if (now - attempt.firstAttemptTime > LOCKOUT_DURATION_MS) {
        loginAttempts.delete(username);
      }
    }
  }

  /**
   * Reset all attempts (for testing only)
   */
  static reset(): void {
    loginAttempts.clear();
  }
}

// Run cleanup every 5 minutes
setInterval(() => LoginAttemptsService.cleanup(), 5 * 60 * 1000);
