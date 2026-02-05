/**
 * Request utilities for security (IP, CSRF)
 */

import { NextRequest } from 'next/server';

/**
 * Get client IP from request (supports Vercel/proxy headers)
 */
export function getClientIp(request: NextRequest | Request): string {
  const req = request as NextRequest;
  const xff = req.headers?.get?.('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers?.get?.('x-real-ip');
  if (xri) return xri.trim() || 'unknown';
  return 'unknown';
}

/**
 * Check Origin/Referer for same-origin (CSRF mitigation for state-changing requests).
 * Returns true if request is allowed (same-origin or no origin in same-origin context).
 * Call this only for POST/PUT/PATCH/DELETE.
 */
export function isSameOriginRequest(request: Request, allowedOrigin: string): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Same-origin requests often omit Origin; Referer may be set
  if (!origin && !referer) {
    return true; // Same-origin form submit or fetch without Origin (e.g. same site)
  }

  try {
    const base = new URL(allowedOrigin);
    if (origin) {
      const o = new URL(origin);
      return o.origin === base.origin;
    }
    if (referer) {
      const r = new URL(referer);
      return r.origin === base.origin;
    }
  } catch {
    return false;
  }

  return false;
}
