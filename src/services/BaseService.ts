/**
 * Base Service
 * 
 * Abstract base class for all services.
 * Provides common business logic patterns and outlet validation.
 */

import { SessionUser } from '@/lib/session';
import { validateOutletId } from '@/lib/outlet';

/**
 * Base service with outlet validation
 */
export abstract class BaseService {
  /**
   * Validate and get outletId from session user
   */
  protected getOutletId(user: SessionUser | null): string {
    if (!user) {
      throw new Error('Authentication required');
    }
    return validateOutletId(user.outletId, this.constructor.name);
  }

  /**
   * Get outletId or null (for optional outlet operations)
   */
  protected getOutletIdOrNull(user: SessionUser | null): string | null {
    return user?.outletId || null;
  }

  /**
   * Validate user has required role
   */
  protected requireRole(
    user: SessionUser | null,
    requiredRole: string | string[]
  ): void {
    if (!user) {
      throw new Error('Authentication required');
    }
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }
  }
}
