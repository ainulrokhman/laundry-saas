/**
 * Authentication types for NextAuth.js
 * Extended session with outlet context for multi-tenancy
 */

import { Role } from "./enums/Role";
import type { Session } from "next-auth";

/**
 * Extended session type with outlet context
 * This is used throughout the application to ensure tenant isolation
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  outletId: string;
}

/**
 * NextAuth session with outlet context
 * Extends Session to include outlet context for multi-tenancy
 */
export interface ExtendedSession extends Session {
  user: SessionUser;
  outletId: string;
  role: Role;
}

/**
 * JWT token payload
 */
export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  outletId: string;
}
