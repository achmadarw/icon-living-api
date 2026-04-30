import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginAttemptsService } from '../../services/login-attempts.service';

describe('LoginAttemptsService', () => {
  beforeEach(() => {
    // Reset all attempts before each test
    LoginAttemptsService.reset();
  });

  describe('recordFailedAttempt', () => {
    it('should record first failed attempt', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      const count = LoginAttemptsService.getAttemptCount('user1');
      expect(count).toBe(1);
    });

    it('should increment failed attempts', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      const count = LoginAttemptsService.getAttemptCount('user1');
      expect(count).toBe(3);
    });

    it('should track different users independently', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user2');
      
      expect(LoginAttemptsService.getAttemptCount('user1')).toBe(2);
      expect(LoginAttemptsService.getAttemptCount('user2')).toBe(1);
    });
  });

  describe('isLockedOut', () => {
    it('should return null if user has no attempts', () => {
      const lockoutTime = LoginAttemptsService.isLockedOut('user1');
      expect(lockoutTime).toBeNull();
    });

    it('should return null if attempts are below max', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      
      const lockoutTime = LoginAttemptsService.isLockedOut('user1');
      expect(lockoutTime).toBeNull();
    });

    it('should return lockout time when max attempts exceeded', () => {
      // Record 5 failed attempts (MAX_FAILED_ATTEMPTS = 5)
      for (let i = 0; i < 5; i++) {
        LoginAttemptsService.recordFailedAttempt('user1');
      }
      
      const lockoutTime = LoginAttemptsService.isLockedOut('user1');
      expect(lockoutTime).not.toBeNull();
      expect(typeof lockoutTime).toBe('number');
      expect(lockoutTime).toBeGreaterThan(0);
    });

    it('should return remaining seconds', () => {
      for (let i = 0; i < 5; i++) {
        LoginAttemptsService.recordFailedAttempt('user1');
      }
      
      const lockoutTime = LoginAttemptsService.isLockedOut('user1');
      // Should be close to 900 seconds (15 minutes)
      expect(lockoutTime).toBeLessThanOrEqual(900);
      expect(lockoutTime).toBeGreaterThan(890);
    });
  });

  describe('clearAttempts', () => {
    it('should clear failed attempts for a user', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      
      LoginAttemptsService.clearAttempts('user1');
      const count = LoginAttemptsService.getAttemptCount('user1');
      expect(count).toBe(0);
    });

    it('should allow login after clearing attempts', () => {
      for (let i = 0; i < 5; i++) {
        LoginAttemptsService.recordFailedAttempt('user1');
      }
      
      expect(LoginAttemptsService.isLockedOut('user1')).not.toBeNull();
      
      LoginAttemptsService.clearAttempts('user1');
      expect(LoginAttemptsService.isLockedOut('user1')).toBeNull();
    });

    it('should not affect other users', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user2');
      
      LoginAttemptsService.clearAttempts('user1');
      
      expect(LoginAttemptsService.getAttemptCount('user1')).toBe(0);
      expect(LoginAttemptsService.getAttemptCount('user2')).toBe(1);
    });
  });

  describe('getAttemptCount', () => {
    it('should return 0 for user with no attempts', () => {
      const count = LoginAttemptsService.getAttemptCount('user1');
      expect(count).toBe(0);
    });

    it('should return correct attempt count', () => {
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      LoginAttemptsService.recordFailedAttempt('user1');
      
      expect(LoginAttemptsService.getAttemptCount('user1')).toBe(3);
    });
  });

  describe('per-username isolation', () => {
    it('should not affect other users when one is locked out', () => {
      // User A: 5 failed attempts → locked out
      for (let i = 0; i < 5; i++) {
        LoginAttemptsService.recordFailedAttempt('userA');
      }
      
      // User B: 1 failed attempt → should not be locked out
      LoginAttemptsService.recordFailedAttempt('userB');
      
      expect(LoginAttemptsService.isLockedOut('userA')).not.toBeNull();
      expect(LoginAttemptsService.isLockedOut('userB')).toBeNull();
      expect(LoginAttemptsService.getAttemptCount('userB')).toBe(1);
    });

    it('should allow new login attempt from different user with same IP', () => {
      // This simulates the fix: multiple users from same IP can try login independently
      const users = ['user1', 'user2', 'user3'];
      
      // User1 fails 5 times
      for (let i = 0; i < 5; i++) {
        LoginAttemptsService.recordFailedAttempt('user1');
      }
      
      // User2 and User3 should still be able to attempt login
      expect(LoginAttemptsService.isLockedOut('user1')).not.toBeNull();
      expect(LoginAttemptsService.isLockedOut('user2')).toBeNull();
      expect(LoginAttemptsService.isLockedOut('user3')).toBeNull();
      
      // User2 can try to login
      LoginAttemptsService.recordFailedAttempt('user2');
      expect(LoginAttemptsService.getAttemptCount('user2')).toBe(1);
    });
  });
});
