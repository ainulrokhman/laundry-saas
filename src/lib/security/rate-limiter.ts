/**
 * Rate Limiter Utility
 * 
 * Reusable rate limiting utility for API endpoints.
 * Uses in-memory storage (for development) - in production, consider using Redis.
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * In-memory rate limit store
 * Key: identifier (phone, userId, IP, etc.), Value: array of attempt timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimit(identifier: string, windowMs: number): void {
  const now = Date.now();
  const timestamps = rateLimitStore.get(identifier) || [];
  const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);
  
  if (validTimestamps.length === 0) {
    rateLimitStore.delete(identifier);
  } else {
    rateLimitStore.set(identifier, validTimestamps);
  }
}

/**
 * Check rate limit for an identifier
 * 
 * @param identifier - Unique identifier (phone, userId, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupRateLimit(identifier, config.windowMs);
  const timestamps = rateLimitStore.get(identifier) || [];
  const remaining = Math.max(0, config.maxAttempts - timestamps.length);
  const allowed = timestamps.length < config.maxAttempts;
  
  // Calculate reset time (oldest timestamp + window)
  const resetAt = timestamps.length > 0
    ? new Date(Math.min(...timestamps) + config.windowMs)
    : new Date(Date.now() + config.windowMs);

  return {
    allowed,
    remaining,
    resetAt,
  };
}

/**
 * Record an attempt for rate limiting
 * 
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export function recordAttempt(
  identifier: string,
  config: RateLimitConfig
): void {
  const now = Date.now();
  const timestamps = rateLimitStore.get(identifier) || [];
  timestamps.push(now);
  rateLimitStore.set(identifier, timestamps);
  
  // Clean up old entries
  cleanupRateLimit(identifier, config.windowMs);
}

/**
 * Clear rate limit for an identifier
 * 
 * @param identifier - Unique identifier
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit info without recording an attempt
 * 
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function getRateLimitInfo(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimit(identifier, config);
}
