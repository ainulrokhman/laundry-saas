/**
 * Input Sanitization Utilities
 * 
 * Comprehensive input sanitization to prevent XSS, SQL injection, and other attacks.
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * and trimming whitespace
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs (for textarea inputs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitize phone number (remove non-digit characters except +)
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except +
  let sanitized = phone.replace(/[^\d+]/g, '');

  // Remove + if not at the start
  if (sanitized.startsWith('+')) {
    sanitized = '+' + sanitized.slice(1).replace(/\+/g, '');
  } else {
    sanitized = sanitized.replace(/\+/g, '');
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  let sanitized = email.trim().toLowerCase();

  // Basic email validation - remove invalid characters
  sanitized = sanitized.replace(/[^\w@.-]/g, '');

  return sanitized;
}

/**
 * Sanitize numeric input (remove non-numeric characters)
 */
export function sanitizeNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }

  if (!input || typeof input !== 'string') {
    return 0;
  }

  // Remove all non-numeric characters except decimal point and minus sign
  const sanitized = input.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(sanitized);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: string | number | null | undefined): number {
  const num = sanitizeNumber(input);
  return Math.floor(num);
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  let sanitized = url.trim();

  // Remove javascript: and data: protocols (XSS prevention)
  sanitized = sanitized.replace(/^(javascript|data|vbscript):/i, '');

  // Basic URL validation
  try {
    const urlObj = new URL(sanitized);
    // Only allow http, https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    return sanitized;
  } catch {
    // If URL parsing fails, return empty string
    return '';
  }
}

/**
 * Sanitize object by recursively sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) =>
        typeof item === 'string' ? sanitizeString(item) : typeof item === 'object' && item !== null ? sanitizeObject(item) : item
      ) as any;
    }
  }

  return sanitized;
}

/**
 * Sanitize HTML content (basic - for simple text content)
 * For production, consider using a library like DOMPurify
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  return sanitized;
}
