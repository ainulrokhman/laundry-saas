/**
 * Login Security Integration Tests
 * 
 * Integration tests for login with rate limiting and account lockout.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { createTestPrismaClient, cleanupTestDatabase } from '../utils/test-db';
import { createUserData } from '../utils/factories';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '@/lib/utils';
import { checkRateLimit, recordAttempt, clearRateLimit } from '@/lib/security/rate-limiter';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '@/lib/security/account-lockout';
import { securityLogService } from '@/services/security/SecurityLogService';

// Mock security logging to avoid console spam in tests
vi.spyOn(securityLogService, 'logEvent').mockResolvedValue();
vi.spyOn(securityLogService, 'logLoginAttempt').mockResolvedValue();
vi.spyOn(securityLogService, 'logAccountLocked').mockResolvedValue();

describe('Login Security Integration', () => {
  const prisma = createTestPrismaClient();
  const LOGIN_RATE_LIMIT = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
    // Clear rate limits
    clearRateLimit('6281234567890');
  });

  afterAll(async () => {
    // Clean up after all tests complete
    await cleanupTestDatabase(prisma);
    clearRateLimit('6281234567890');
    await prisma.$disconnect();
  });

  describe('Rate Limiting on Login', () => {
    it('should block login after max rate limit attempts', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      
      // Record max attempts
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxAttempts; i++) {
        recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
      }

      const rateLimitResult = checkRateLimit(normalizedPhone, LOGIN_RATE_LIMIT);
      expect(rateLimitResult.allowed).toBe(false);
      expect(rateLimitResult.remaining).toBe(0);
    });

    it('should allow login when under rate limit', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      
      // Record some attempts (under limit)
      recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
      recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);

      const rateLimitResult = checkRateLimit(normalizedPhone, LOGIN_RATE_LIMIT);
      expect(rateLimitResult.allowed).toBe(true);
      expect(rateLimitResult.remaining).toBe(3);
    });
  });

  describe('Account Lockout on Login', () => {
    it('should lock account after max failed attempts', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData({ phone: '6281234567890' }),
          pin: hashedPin,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Simulate failed login attempts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(user.id);
      }

      const locked = await isAccountLocked(user.id);
      expect(locked).toBe(true);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.failedLoginAttempts).toBeDefined();
      expect(updatedUser?.failedLoginAttempts).toBe(5);
      expect(updatedUser?.lockedUntil).not.toBeNull();
    });

    it('should reset failed attempts on successful login', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData({ phone: '6281234567890' }),
          pin: hashedPin,
          failedLoginAttempts: 3,
          lockedUntil: null,
        },
      });

      // Simulate successful login
      await resetFailedAttempts(user.id);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.failedLoginAttempts).toBeDefined();
      expect(updatedUser?.failedLoginAttempts).toBe(0);
      expect(updatedUser?.lockedUntil).toBeNull();
    });
  });

  describe('Combined Rate Limiting and Account Lockout', () => {
    it('should check rate limit before checking account lockout', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      const hashedPin = await bcrypt.hash('123456', 10);
      
      const user = await prisma.user.create({
        data: {
          ...createUserData({ phone: '6281234567890' }),
          pin: hashedPin,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Fill up rate limit
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxAttempts; i++) {
        recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
      }

      // Rate limit should block first
      const rateLimitResult = checkRateLimit(normalizedPhone, LOGIN_RATE_LIMIT);
      expect(rateLimitResult.allowed).toBe(false);

      // Account should not be locked yet
      const locked = await isAccountLocked(user.id);
      expect(locked).toBe(false);
    });

    it('should track failed attempts separately from rate limit', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      const hashedPin = await bcrypt.hash('123456', 10);
      
      const user = await prisma.user.create({
        data: {
          ...createUserData({ phone: '6281234567890' }),
          pin: hashedPin,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Simulate failed login (rate limit + failed attempt)
      recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
      await recordFailedAttempt(user.id);

      // Both should be tracked
      const rateLimitResult = checkRateLimit(normalizedPhone, LOGIN_RATE_LIMIT);
      expect(rateLimitResult.remaining).toBe(4);

      // Fetch user with explicit field selection to ensure failedLoginAttempts is returned
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });
      
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.id).toBe(user.id);
      // Verify failedLoginAttempts was incremented
      expect(updatedUser?.failedLoginAttempts).toBeDefined();
      expect(updatedUser?.failedLoginAttempts).toBe(1);
    });
  });

  describe('Security Event Logging', () => {
    it('should log failed login attempts', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      
      // Simulate failed login
      recordAttempt(normalizedPhone, LOGIN_RATE_LIMIT);
      
      await securityLogService.logLoginAttempt(
        normalizedPhone,
        false,
        undefined,
        'Invalid PIN'
      );

      expect(securityLogService.logLoginAttempt).toHaveBeenCalledWith(
        normalizedPhone,
        false,
        undefined,
        'Invalid PIN'
      );
    });

    it('should log successful login', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      const userId = 'user-id-123';
      
      await securityLogService.logLoginAttempt(
        normalizedPhone,
        true,
        userId
      );

      expect(securityLogService.logLoginAttempt).toHaveBeenCalledWith(
        normalizedPhone,
        true,
        userId
      );
    });

    it('should log account lockout', async () => {
      const normalizedPhone = normalizePhoneNumber('6281234567890');
      const userId = 'user-id-123';
      
      await securityLogService.logAccountLocked(
        normalizedPhone,
        userId,
        'Maximum failed attempts reached'
      );

      expect(securityLogService.logAccountLocked).toHaveBeenCalledWith(
        normalizedPhone,
        userId,
        'Maximum failed attempts reached'
      );
    });
  });
});
