/**
 * Session Management Utilities
 * 
 * Helper functions for working with NextAuth sessions
 * Includes role-based access checks and session helpers
 */

import { auth } from './auth';
import { Role } from '../generated/prisma';

/**
 * Extended session user type
 */
export interface SessionUser {
  userId: string;
  outletId: string | null;
  role: Role;
  phone: string;
}

/**
 * Get current session with type safety
 */
export async function getSession() {
  return await auth();
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }
  
  const user = session.user as any;
  return {
    userId: user.userId,
    outletId: user.outletId,
    role: user.role,
    phone: user.phone,
  };
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: Role | undefined, requiredRole: Role | Role[]): boolean {
  if (!userRole) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  
  // Role hierarchy: SUPERADMIN > OWNER > STAFF
  const roleHierarchy: Record<Role, number> = {
    SUPERADMIN: 3,
    OWNER: 2,
    STAFF: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user is SuperAdmin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === Role.SUPERADMIN;
}

/**
 * Check if user is Owner
 */
export async function isOwner(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === Role.OWNER;
}

/**
 * Check if user is Staff
 */
export async function isStaff(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === Role.STAFF;
}

/**
 * Check if user is Owner or SuperAdmin
 */
export async function isOwnerOrSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === Role.OWNER || user?.role === Role.SUPERADMIN;
}

/**
 * Get outletId from session (throws if not available)
 */
export async function getOutletId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.outletId) {
    throw new Error('Outlet ID not found in session');
  }
  return user.outletId;
}

/**
 * Get outletId from session (returns null if not available)
 */
export async function getOutletIdOrNull(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.outletId || null;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Require specific role (throws if user doesn't have required role)
 */
export async function requireRole(role: Role | Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasRole(user.role, role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

/**
 * Require outletId (throws if not available)
 */
export async function requireOutletId(): Promise<string> {
  const user = await requireAuth();
  if (!user.outletId) {
    throw new Error('Outlet ID required');
  }
  return user.outletId;
}
