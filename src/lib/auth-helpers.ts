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
