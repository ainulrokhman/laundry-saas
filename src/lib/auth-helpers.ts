/**
 * Authentication Helper Functions
 * Utility functions for checking permissions and accessing session
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Role } from "@/types/enums/Role";
import type { ExtendedSession } from "@/types/auth";

/**
 * Get current session with outlet context
 * Use this in server components and API routes
 */
export async function getSession(): Promise<ExtendedSession | null> {
  const session = await getServerSession(authOptions);
  return session as ExtendedSession | null;
}

/**
 * Get current user from session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Get outlet ID from session
 * Returns null if not authenticated or no outlet context
 */
export async function getOutletId(): Promise<string | null> {
  const session = await getSession();
  return session?.outletId ?? null;
}

/**
 * Check if user has required role
 * @param requiredRole - Required role to check
 * @param userRole - User's current role
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    [Role.SUPERADMIN]: 3,
    [Role.OWNER]: 2,
    [Role.STAFF]: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access outlet
 * SUPERADMIN can access all outlets
 * OWNER and STAFF can only access their own outlet
 */
export function canAccessOutlet(
  userRole: Role,
  userOutletId: string,
  targetOutletId: string
): boolean {
  // SUPERADMIN can access all outlets
  if (userRole === Role.SUPERADMIN) {
    return true;
  }

  // OWNER and STAFF can only access their own outlet
  return userOutletId === targetOutletId;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  return session;
}

/**
 * Require specific role - throws error if user doesn't have required role
 */
export async function requireRole(requiredRole: Role): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (!hasRole(session.role, requiredRole)) {
    throw new Error(`Forbidden: ${requiredRole} role required`);
  }

  return session;
}

/**
 * Require outlet access - throws error if user can't access outlet
 */
export async function requireOutletAccess(
  targetOutletId: string
): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (!canAccessOutlet(session.role, session.outletId, targetOutletId)) {
    throw new Error("Forbidden: Cannot access this outlet");
  }

  return session;
}

/**
 * Require outlet ID in session - throws error if missing
 * SUPERADMIN might not have outletId, which is OK for some operations
 * But for tenant-scoped operations, we need outletId
 */
export async function requireOutletId(): Promise<string> {
  const session = await requireAuth();

  if (!session.outletId && session.role !== Role.SUPERADMIN) {
    throw new Error("Missing outletId in session");
  }

  return session.outletId || "";
}

/**
 * Build tenant filter for database queries
 * Returns outletId filter or null for SUPERADMIN (no filter)
 * 
 * @returns Object with outletId or null
 */
export async function getTenantFilter(): Promise<{ outletId: string } | null> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  // SUPERADMIN can access all outlets (no filter)
  if (session.role === Role.SUPERADMIN) {
    return null;
  }

  // OWNER and STAFF must have outletId
  if (!session.outletId) {
    throw new Error("Missing outletId in session for non-SUPERADMIN user");
  }

  return { outletId: session.outletId };
}

/**
 * Verify tenant access and return session
 * Throws error if access is denied
 * 
 * @param targetOutletId - Outlet ID to verify access for
 * @returns ExtendedSession if access is granted
 */
export async function verifyTenantAccess(
  targetOutletId: string
): Promise<ExtendedSession> {
  return requireOutletAccess(targetOutletId);
}
