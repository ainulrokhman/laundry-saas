/**
 * Data masking utilities for logs and non-DTO responses.
 * Sensitive fields should not appear in plain text in logs or error messages.
 */

/**
 * Mask phone number: tampilkan 4 karakter awal dan 4 akhir, sisanya *
 * Contoh: 6281234567890 -> 6281***7890
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '***';
  const s = phone.replace(/\D/g, '');
  if (s.length <= 8) return '*'.repeat(s.length);
  return s.slice(0, 4) + '***' + s.slice(-4);
}

/**
 * Mask email: tampilkan 2 karakter awal dan domain
 * Contoh: user@example.com -> us***@example.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return local[0] + '***' + domain;
  return local.slice(0, 2) + '***' + domain;
}

/**
 * Mask string generik (nama, dll): tampilkan N karakter awal, sisanya *
 */
export function maskString(value: string | null | undefined, visibleStart: number = 2, visibleEnd: number = 0): string {
  if (!value || typeof value !== 'string') return '***';
  if (value.length <= visibleStart + visibleEnd) return '*'.repeat(value.length);
  const start = value.slice(0, visibleStart);
  const end = visibleEnd > 0 ? value.slice(-visibleEnd) : '';
  const mid = '*'.repeat(Math.max(0, value.length - visibleStart - visibleEnd));
  return start + mid + end;
}

const SENSITIVE_KEYS = new Set([
  'password', 'pin', 'token', 'secret', 'apiKey', 'api_key', 'authorization',
  'cookie', 'sessionId', 'accessToken', 'refreshToken',
]);

/**
 * Recursively scrub object: replace values of sensitive keys with '[REDACTED]'
 * Untuk keperluan logging atau response yang tidak melalui DTO.
 */
export function scrubSensitive<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj } as T;
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) {
      (out as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (out[key] !== null && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      (out as Record<string, unknown>)[key] = scrubSensitive(out[key] as Record<string, unknown>);
    }
  }
  return out;
}
