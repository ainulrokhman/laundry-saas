/**
 * Outlet Utilities
 * 
 * Utility functions for outlet filtering and multi-tenancy operations.
 * These functions ensure outletId is always included in queries.
 */

import { SessionUser } from './session';

/**
 * Get outletId from session user
 * Throws error if outletId is not available
 */
export function requireOutletIdFromSession(
  user: SessionUser | null
): string {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!user.outletId) {
    throw new Error('Outlet context required');
  }
  return user.outletId;
}

/**
 * Get outletId from session user (returns null if not available)
 */
export function getOutletIdFromSession(
  user: SessionUser | null
): string | null {
  return user?.outletId || null;
}

/**
 * Create outlet filter object for Prisma queries
 */
export function createOutletFilter(outletId: string): { outletId: string } {
  if (!outletId) {
    throw new Error('Outlet ID is required for multi-tenancy isolation');
  }
  return { outletId };
}

/**
 * Combine outlet filter with additional where conditions
 */
export function combineOutletFilter<T extends Record<string, any>>(
  outletId: string,
  additionalFilters?: T
): T & { outletId: string } {
  if (!outletId) {
    throw new Error('Outlet ID is required for multi-tenancy isolation');
  }
  return {
    ...additionalFilters,
    outletId,
  } as T & { outletId: string };
}

/**
 * Validate outletId is present
 */
export function validateOutletId(
  outletId: string | null | undefined,
  context: string = 'Operation'
): string {
  if (!outletId) {
    throw new Error(`${context} requires outletId for multi-tenancy isolation`);
  }
  return outletId;
}
