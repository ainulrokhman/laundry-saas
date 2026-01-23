/**
 * Utility Functions
 * 
 * Common helper functions used throughout the application.
 */

/**
 * Merge CSS classes (simple implementation)
 * For Tailwind class merging, consider installing clsx and tailwind-merge
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format phone number to standard format
 * Example: 081234567890 -> +6281234567890
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 62
  if (digits.startsWith('0')) {
    return `+62${digits.slice(1)}`;
  }
  
  // If doesn't start with +, add it
  if (!digits.startsWith('62')) {
    return `+62${digits}`;
  }
  
  return `+${digits}`;
}

/**
 * Validate phone number format (Indonesian)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Indonesian phone numbers: 10-13 digits after country code
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Mask sensitive data (e.g., phone numbers, names)
 * Example: "081234567890" -> "0812****7890"
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const masked = '*'.repeat(data.length - visibleChars * 2);
  
  return `${start}${masked}${end}`;
}

/**
 * Generate random tracking code
 */
export function generateTrackingCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format currency (Indonesian Rupiah)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format datetime to Indonesian format
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
