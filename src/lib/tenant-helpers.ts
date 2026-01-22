/**
 * Tenant Isolation Helper Functions
 * 
 * Utility functions to ensure tenant isolation in database queries.
 * Following .cursorrules: Every database query MUST include outletId filter.
 * 
 * These helpers prevent data leakage between tenants by enforcing
 * outletId filtering at the query level.
 */

import { Role } from "@/types/enums/Role";
import type { ExtendedSession } from "@/types/auth";

/**
 * Tenant filter options for database queries
 */
export interface TenantFilter {
  outletId: string;
  role: Role;
}

/**
 * Get tenant filter from session
 * Returns null if session is invalid or missing outletId
 * 
 * @param session - Extended session with outlet context
 * @returns TenantFilter or null if invalid
 */
export function getTenantFilter(session: ExtendedSession | null): TenantFilter | null {
  if (!session) {
    return null;
  }

  // SUPERADMIN can access all outlets (no filter)
  if (session.role === Role.SUPERADMIN) {
    return null; // Return null to indicate no filter needed
  }

  // OWNER and STAFF must have outletId
  if (!session.outletId) {
    throw new Error("Missing outletId in session for non-SUPERADMIN user");
  }

  return {
    outletId: session.outletId,
    role: session.role,
  };
}

/**
 * Build Prisma where clause with tenant isolation
 * 
 * @param session - Extended session with outlet context
 * @param additionalWhere - Additional where conditions
 * @returns Prisma where clause with outletId filter
 * 
 * @example
 * const where = buildTenantWhere(session, { status: 'ACTIVE' });
 * const orders = await prisma.order.findMany({ where });
 */
export function buildTenantWhere<T extends Record<string, unknown>>(
  session: ExtendedSession | null,
  additionalWhere: T = {} as T
): T & { outletId?: string } {
  const tenantFilter = getTenantFilter(session);

  // SUPERADMIN: no outletId filter (can access all)
  if (!tenantFilter) {
    return additionalWhere;
  }

  // OWNER and STAFF: must filter by outletId
  return {
    ...additionalWhere,
    outletId: tenantFilter.outletId,
  };
}

/**
 * Verify tenant access to a specific outlet
 * Throws error if access is denied
 * 
 * @param session - Extended session with outlet context
 * @param targetOutletId - Outlet ID to check access for
 * @throws Error if access is denied
 */
export function verifyTenantAccess(
  session: ExtendedSession | null,
  targetOutletId: string
): void {
  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  // SUPERADMIN can access all outlets
  if (session.role === Role.SUPERADMIN) {
    return;
  }

  // OWNER and STAFF can only access their own outlet
  if (session.outletId !== targetOutletId) {
    throw new Error("Forbidden: Cannot access this outlet");
  }
}

/**
 * Get outletId from session or throw error
 * 
 * @param session - Extended session with outlet context
 * @returns outletId string
 * @throws Error if session is invalid or outletId is missing
 */
export function requireOutletId(session: ExtendedSession | null): string {
  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  // SUPERADMIN might not have outletId, which is OK for some operations
  // But for tenant-scoped operations, we need to know which outlet
  if (!session.outletId && session.role !== Role.SUPERADMIN) {
    throw new Error("Missing outletId in session");
  }

  return session.outletId || "";
}

/**
 * Check if user can access outlet (returns boolean)
 * 
 * @param session - Extended session with outlet context
 * @param targetOutletId - Outlet ID to check
 * @returns true if access is allowed, false otherwise
 */
export function canAccessOutlet(
  session: ExtendedSession | null,
  targetOutletId: string
): boolean {
  if (!session) {
    return false;
  }

  // SUPERADMIN can access all outlets
  if (session.role === Role.SUPERADMIN) {
    return true;
  }

  // OWNER and STAFF can only access their own outlet
  return session.outletId === targetOutletId;
}

/**
 * Get outletId from request headers (set by middleware)
 * 
 * @param headers - Request headers
 * @returns outletId or null
 */
export function getOutletIdFromHeaders(headers: Headers): string | null {
  return headers.get("x-outlet-id") || null;
}

/**
 * Get user role from request headers (set by middleware)
 * 
 * @param headers - Request headers
 * @returns Role or null
 */
export function getRoleFromHeaders(headers: Headers): Role | null {
  const role = headers.get("x-user-role");
  return role ? (role as Role) : null;
}
