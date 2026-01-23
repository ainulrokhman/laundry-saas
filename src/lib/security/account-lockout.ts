/**
 * Account Lockout Utility
 * 
 * Handles account lockout after multiple failed login attempts.
 */

import { prisma } from '@/lib/prisma';

export interface AccountLockoutConfig {
  maxFailedAttempts: number;
  lockoutDurationMs: number; // Lockout duration in milliseconds
}

/**
 * Default account lockout configuration
 */
export const DEFAULT_LOCKOUT_CONFIG: AccountLockoutConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Check if account is locked
 * 
 * @param userId - User ID
 * @returns true if account is locked, false otherwise
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return false;
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return true;
  }

  // If lockout expired, reset failed attempts
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    // Use updateMany instead of update to avoid error if user was deleted
    // between find and update (e.g., during test cleanup or concurrent operations)
    // updateMany returns count of updated records (0 if none found) but doesn't throw
    await prisma.user.updateMany({
      where: { 
        id: userId,
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    return false;
  }

  return false;
}

/**
 * Record a failed login attempt
 * 
 * @param userId - User ID
 * @param config - Lockout configuration
 * @returns true if account should be locked, false otherwise
 */
export async function recordFailedAttempt(
  userId: string,
  config: AccountLockoutConfig = DEFAULT_LOCKOUT_CONFIG
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return false;
  }

  const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
  const shouldLock = newFailedAttempts >= config.maxFailedAttempts;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newFailedAttempts,
      lockedUntil: shouldLock
        ? new Date(Date.now() + config.lockoutDurationMs)
        : null,
    },
  });

  return shouldLock;
}

/**
 * Reset failed login attempts (on successful login)
 * 
 * @param userId - User ID
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Get lockout info for a user
 * 
 * @param userId - User ID
 * @returns Lockout information
 */
export async function getLockoutInfo(userId: string): Promise<{
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: DEFAULT_LOCKOUT_CONFIG.maxFailedAttempts,
    };
  }

  const isLocked = user.lockedUntil ? user.lockedUntil > new Date() : false;
  const failedAttempts = user.failedLoginAttempts || 0;
  const remainingAttempts = Math.max(
    0,
    DEFAULT_LOCKOUT_CONFIG.maxFailedAttempts - failedAttempts
  );

  return {
    isLocked,
    lockedUntil: user.lockedUntil,
    failedAttempts,
    remainingAttempts,
  };
}
