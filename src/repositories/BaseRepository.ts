/**
 * Base Repository
 * 
 * Abstract base class for all repositories.
 * Provides outlet filtering utilities and common database operations.
 * Ensures all queries include outletId filter for multi-tenancy isolation.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

/**
 * Base repository with outlet filtering
 */
export abstract class BaseRepository {
  /**
   * Get outlet filter for queries
   * Always include outletId in where clause for multi-tenancy isolation
   */
  protected getOutletFilter(outletId: string): { outletId: string } {
    return { outletId };
  }

  /**
   * Combine outlet filter with additional where conditions
   */
  protected combineFilters<T extends Record<string, any>>(
    outletId: string,
    additionalFilters?: T
  ): T & { outletId: string } {
    return {
      ...additionalFilters,
      outletId,
    } as T & { outletId: string };
  }

  /**
   * Ensure outletId is present in where clause
   * Throws error if outletId is missing (safety check)
   */
  protected ensureOutletId(
    outletId: string | null | undefined,
    modelName: string = 'Resource'
  ): string {
    if (!outletId) {
      throw new Error(
        `${modelName} operations require outletId for multi-tenancy isolation`
      );
    }
    return outletId;
  }
}
