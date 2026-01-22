/**
 * Next.js Proxy
 * Handles route protection and tenant isolation
 * Following security best practices from .cursorrules
 * 
 * This proxy function intercepts requests at the edge to:
 * 1. Verify authentication on protected routes
 * 2. Ensure outletId is present in session (tenant isolation)
 * 3. Enforce role-based access control
 * 4. Add tenant context to request headers for downstream use
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Role } from "@/types/enums/Role";

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  "/",
  "/auth/signin",
  "/auth/signout",
  "/auth/error",
  "/api/auth",
  "/track",
  "/outlet",
];

/**
 * Routes that require SUPERADMIN role
 */
const superAdminRoutes = ["/admin", "/api/admin", "/dashboard/outlets", "/api/outlets"];

/**
 * Routes that require OWNER or higher role
 */
const ownerRoutes = ["/dashboard", "/api/outlet"];

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/outlet/") ||
    pathname.startsWith("/track/")
  );
}

/**
 * Check if route requires SUPERADMIN
 */
function isSuperAdminRoute(pathname: string): boolean {
  return superAdminRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Check if route requires OWNER or higher
 */
function isOwnerRoute(pathname: string): boolean {
  return ownerRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Proxy function
 * Runs on every request to protect routes and ensure tenant isolation
 * Intercepts and reshapes requests/responses at the edge
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get JWT token from request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to signin if not authenticated
  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const userRole = token.role as Role | undefined;
  const outletId = token.outletId as string | undefined;

  // Validate token has required fields
  if (!userRole) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid session" },
      { status: 401 }
    );
  }

  // Check SUPERADMIN routes
  if (isSuperAdminRoute(pathname)) {
    if (userRole !== Role.SUPERADMIN) {
      return NextResponse.json(
        { error: "Forbidden: SUPERADMIN access required" },
        { status: 403 }
      );
    }
  }

  // Check OWNER routes
  if (isOwnerRoute(pathname)) {
    if (userRole === Role.STAFF) {
      return NextResponse.json(
        { error: "Forbidden: OWNER access required" },
        { status: 403 }
      );
    }
  }

  // Ensure outletId is present for non-SUPERADMIN users
  if (userRole !== Role.SUPERADMIN && !outletId) {
    return NextResponse.json(
      { error: "Unauthorized: Missing outlet context" },
      { status: 401 }
    );
  }

  // Add outlet context to request headers for downstream use
  // This ensures tenant isolation in API routes and server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-outlet-id", outletId || "");
  requestHeaders.set("x-user-role", userRole);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Configure which routes the proxy runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
