/**
 * Route Proxy Pattern
 * 
 * This file implements a proxy pattern for route protection and authentication.
 * Instead of using Next.js middleware, we use a proxy function that wraps
 * route handlers to ensure authentication and authorization checks.
 * 
 * Usage:
 * ```typescript
 * import { withAuth } from '@/lib/proxy/route-proxy';
 * 
 * export const GET = withAuth(async (request, session) => {
 *   // Your route handler logic here
 *   // session.outletId is guaranteed to exist
 *   return Response.json({ data: 'protected' });
 * });
 * ```
 */

import { getServerSession } from 'next-auth';
import { authOptions, ExtendedSession } from '../auth';
import { Role } from '../../generated/prisma';

/**
 * Options for route protection
 */
export interface RouteProxyOptions {
  /**
   * Required roles to access the route
   * If empty, any authenticated user can access
   */
  roles?: Role[];
  
  /**
   * Whether outletId is required in session
   * Default: true (most routes require outlet context)
   */
  requireOutlet?: boolean;
  
  /**
   * Custom authorization function
   * Return true to allow access, false or throw error to deny
   */
  authorize?: (session: ExtendedSession) => Promise<boolean> | boolean;
}

/**
 * Proxy wrapper for route handlers
 * 
 * Ensures authentication and optional authorization before executing the handler.
 * 
 * @param handler - The route handler function
 * @param options - Protection options
 * @returns Protected route handler
 */
export function withAuth<T = any>(
  handler: (request: Request, session: ExtendedSession) => Promise<Response>,
  options: RouteProxyOptions = {}
): (request: Request) => Promise<Response> {
  const {
    roles = [],
    requireOutlet = true,
    authorize,
  } = options;

  return async (request: Request): Promise<Response> => {
    try {
      // Get session
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const extendedSession = session.user as unknown as ExtendedSession;

      // Check outlet requirement
      if (requireOutlet && !extendedSession.outletId) {
        return new Response(
          JSON.stringify({ error: 'Outlet context required' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check role requirement
      if (roles.length > 0 && !roles.includes(extendedSession.role)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Custom authorization check
      if (authorize) {
        const authorized = await authorize(extendedSession);
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Execute handler with session
      return await handler(request, extendedSession);
    } catch (error) {
      console.error('Route proxy error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Proxy wrapper for admin-only routes (SUPERADMIN role)
 */
export function withAdminAuth<T = any>(
  handler: (request: Request, session: ExtendedSession) => Promise<Response>
): (request: Request) => Promise<Response> {
  return withAuth(handler, {
    roles: [Role.SUPERADMIN],
    requireOutlet: false,
  });
}

/**
 * Proxy wrapper for owner-only routes (OWNER role)
 */
export function withOwnerAuth<T = any>(
  handler: (request: Request, session: ExtendedSession) => Promise<Response>
): (request: Request) => Promise<Response> {
  return withAuth(handler, {
    roles: [Role.OWNER],
    requireOutlet: true,
  });
}

/**
 * Proxy wrapper for public routes (no authentication required)
 * Still provides session if available
 */
export function withPublicAuth<T = any>(
  handler: (request: Request, session: ExtendedSession | null) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      const session = await getServerSession(authOptions);
      const extendedSession = session?.user 
        ? (session.user as unknown as ExtendedSession)
        : null;
      
      return await handler(request, extendedSession);
    } catch (error) {
      console.error('Route proxy error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
