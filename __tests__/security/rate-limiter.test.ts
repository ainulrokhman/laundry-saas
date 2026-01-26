/**
 * Rate Limiter Tests
 * 
 * Tests for the rate limiting utility used in authentication endpoints.
 * 
 * @vitest-environment node
 */

import {
  checkRateLimit,
  recordAttempt,
  clearRateLimit,
  getRateLimitInfo,
  RateLimitConfig,
} from '@/lib/security/rate-limiter';

describe('Rate Limiter', () => {
  const config: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 1000, // 1 second for testing
  };

  beforeEach(() => {
    // Clear all rate limits before each test
    clearRateLimit('test-identifier-1');
    clearRateLimit('test-identifier-2');
  });

  afterEach(() => {
    // Clean up after each test
    clearRateLimit('test-identifier-1');
    clearRateLimit('test-identifier-2');
  });

  describe('checkRateLimit', () => {
    it('should allow requests when under the limit', () => {
      const result = checkRateLimit('test-identifier-1', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should deny requests when at the limit', () => {
      // Record 5 attempts
      for (let i = 0; i < 5; i++) {
        recordAttempt('test-identifier-1', config);
      }

      const result = checkRateLimit('test-identifier-1', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should calculate remaining attempts correctly', () => {
      // Record 2 attempts
      recordAttempt('test-identifier-1', config);
      recordAttempt('test-identifier-1', config);

      const result = checkRateLimit('test-identifier-1', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it('should reset after window expires', async () => {
      // Record attempts
      for (let i = 0; i < 5; i++) {
        recordAttempt('test-identifier-1', config);
      }

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = checkRateLimit('test-identifier-1', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should have different limits for different identifiers', () => {
      // Fill up identifier 1
      for (let i = 0; i < 5; i++) {
        recordAttempt('test-identifier-1', config);
      }

      // Identifier 2 should still be allowed
      const result1 = checkRateLimit('test-identifier-1', config);
      const result2 = checkRateLimit('test-identifier-2', config);

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('recordAttempt', () => {
    it('should record an attempt', () => {
      recordAttempt('test-identifier-1', config);
      const result = checkRateLimit('test-identifier-1', config);
      expect(result.remaining).toBe(4);
    });

    it('should increment attempt count', () => {
      recordAttempt('test-identifier-1', config);
      recordAttempt('test-identifier-1', config);
      const result = checkRateLimit('test-identifier-1', config);
      expect(result.remaining).toBe(3);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear all attempts for an identifier', () => {
      // Record attempts
      for (let i = 0; i < 5; i++) {
        recordAttempt('test-identifier-1', config);
      }

      // Clear
      clearRateLimit('test-identifier-1');

      // Should be allowed again
      const result = checkRateLimit('test-identifier-1', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should only clear the specified identifier', () => {
      // Record attempts for both
      for (let i = 0; i < 5; i++) {
        recordAttempt('test-identifier-1', config);
        recordAttempt('test-identifier-2', config);
      }

      // Clear only identifier 1
      clearRateLimit('test-identifier-1');

      // Identifier 1 should be allowed, identifier 2 should still be blocked
      const result1 = checkRateLimit('test-identifier-1', config);
      const result2 = checkRateLimit('test-identifier-2', config);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info without recording attempt', () => {
      // Record some attempts
      recordAttempt('test-identifier-1', config);
      recordAttempt('test-identifier-1', config);

      const info1 = getRateLimitInfo('test-identifier-1', config);
      const info2 = getRateLimitInfo('test-identifier-1', config);

      // Should return same info (no new attempt recorded)
      expect(info1.remaining).toBe(3);
      expect(info2.remaining).toBe(3);
    });

    it('should calculate reset time correctly', () => {
      recordAttempt('test-identifier-1', config);
      const info = getRateLimitInfo('test-identifier-1', config);

      expect(info.resetAt).toBeInstanceOf(Date);
      expect(info.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
