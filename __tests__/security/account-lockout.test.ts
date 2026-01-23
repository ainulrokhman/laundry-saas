/**
 * Account Lockout Tests
 * 
 * Tests for account lockout functionality after multiple failed login attempts.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  getLockoutInfo,
  DEFAULT_LOCKOUT_CONFIG,
} from '@/lib/security/account-lockout';
import { createTestPrismaClient, cleanupTestDatabase } from '../utils/test-db';
import { createUserData } from '../utils/factories';
import bcrypt from 'bcryptjs';

describe('Account Lockout', () => {
  const prisma = createTestPrismaClient();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    // Clean up after all tests complete
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('isAccountLocked', () => {
    it('should return false for unlocked account', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const locked = await isAccountLocked(user.id);
      expect(locked).toBe(false);
    });

    it('should return true for locked account', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 5,
          lockedUntil,
        },
      });

      const locked = await isAccountLocked(user.id);
      expect(locked).toBe(true);
    });

    it('should auto-unlock expired lockouts', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const lockedUntil = new Date(Date.now() - 1000); // 1 second ago (expired)
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 5,
          lockedUntil,
        },
      });

      // Verify initial state
      const initialUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });
      expect(initialUser).not.toBeNull();
      expect(initialUser?.failedLoginAttempts).toBe(5);
      expect(initialUser?.lockedUntil).not.toBeNull();

      // Call isAccountLocked which should auto-unlock
      const locked = await isAccountLocked(user.id);
      expect(locked).toBe(false);

      // Verify database was updated - fetch fresh from database
      // Use findUnique without select to get all fields
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      
      // Debug: log what we got
      if (!updatedUser) {
        throw new Error(`User ${user.id} not found after update`);
      }
      
      expect(updatedUser.id).toBe(user.id);
      // The field should be 0 after auto-unlock
      // If it's undefined, it means the update didn't work or field doesn't exist
      expect(updatedUser.failedLoginAttempts).toBeDefined();
      expect(updatedUser.failedLoginAttempts).toBe(0);
      expect(updatedUser.lockedUntil).toBeNull();
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment failed attempts', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const shouldLock = await recordFailedAttempt(user.id);
      expect(shouldLock).toBe(false);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.failedLoginAttempts).toBe(1);
      expect(updatedUser?.lockedUntil).toBeNull();
    });

    it('should lock account after max failed attempts', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 4, // One attempt away from lockout
          lockedUntil: null,
        },
      });

      const shouldLock = await recordFailedAttempt(user.id);
      expect(shouldLock).toBe(true);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.failedLoginAttempts).toBe(5);
      expect(updatedUser?.lockedUntil).not.toBeNull();
      expect(updatedUser?.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should set lockout duration correctly', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 4,
          lockedUntil: null,
        },
      });

      await recordFailedAttempt(user.id);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      const expectedLockoutTime = Date.now() + DEFAULT_LOCKOUT_CONFIG.lockoutDurationMs;
      const actualLockoutTime = updatedUser?.lockedUntil?.getTime() || 0;

      // Allow 1 second tolerance
      expect(Math.abs(actualLockoutTime - expectedLockoutTime)).toBeLessThan(1000);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts to zero', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 3,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await resetFailedAttempts(user.id);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.failedLoginAttempts).toBe(0);
      expect(updatedUser?.lockedUntil).toBeNull();
    });
  });

  describe('getLockoutInfo', () => {
    it('should return correct info for unlocked account', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 2,
          lockedUntil: null,
        },
      });

      const info = await getLockoutInfo(user.id);
      expect(info.isLocked).toBe(false);
      expect(info.lockedUntil).toBeNull();
      expect(info.failedAttempts).toBe(2);
      expect(info.remainingAttempts).toBe(3); // 5 - 2 = 3
    });

    it('should return correct info for locked account', async () => {
      const hashedPin = await bcrypt.hash('123456', 10);
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const user = await prisma.user.create({
        data: {
          ...createUserData(),
          pin: hashedPin,
          failedLoginAttempts: 5,
          lockedUntil,
        },
      });

      const info = await getLockoutInfo(user.id);
      expect(info.isLocked).toBe(true);
      expect(info.lockedUntil).not.toBeNull();
      expect(info.failedAttempts).toBe(5);
      expect(info.remainingAttempts).toBe(0);
    });

    it('should return default info for non-existent user', async () => {
      const info = await getLockoutInfo('non-existent-id');
      expect(info.isLocked).toBe(false);
      expect(info.lockedUntil).toBeNull();
      expect(info.failedAttempts).toBe(0);
      expect(info.remainingAttempts).toBe(DEFAULT_LOCKOUT_CONFIG.maxFailedAttempts);
    });
  });
});
