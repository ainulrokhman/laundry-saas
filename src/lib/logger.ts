/**
 * Central error/logging utility.
 * Use for server-side and API logging; avoids leaking sensitive data.
 * Optional: integrate with Sentry or other monitoring via logError.
 */

import { scrubSensitive } from '@/lib/utils/data-masking';

export type LogLevel = 'info' | 'warn' | 'error';

function serializeMetadata(meta: unknown): Record<string, unknown> {
  if (meta === null || meta === undefined) return {};
  if (typeof meta === 'object' && !Array.isArray(meta)) {
    return scrubSensitive(meta as Record<string, unknown>);
  }
  return { value: meta };
}

/**
 * Log error with optional metadata (metadata is scrubbed for sensitive keys).
 */
export function logError(message: string, error?: unknown, metadata?: Record<string, unknown>): void {
  const payload = {
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...serializeMetadata(metadata ?? {}),
  };
  console.error('[ERROR]', payload);
}

/**
 * Log warning.
 */
export function logWarn(message: string, metadata?: Record<string, unknown>): void {
  console.warn('[WARN]', message, metadata ? serializeMetadata(metadata) : '');
}

/**
 * Log info (e.g. audit or debug).
 */
export function logInfo(message: string, metadata?: Record<string, unknown>): void {
  console.log('[INFO]', message, metadata ? serializeMetadata(metadata) : '');
}
