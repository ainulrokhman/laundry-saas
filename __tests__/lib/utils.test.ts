/**
 * Utils (src/lib/utils.ts) tests
 */

import {
  cn,
  normalizePhoneNumber,
  formatPhoneNumber,
  isValidPhoneNumber,
  maskSensitiveData,
  generateTrackingCode,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateSlug,
} from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should join non-empty class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c');
    });
    it('should filter out falsy values', () => {
      expect(cn('a', undefined, null, false, 'b')).toBe('a b');
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should convert 0-prefix to 62', () => {
      expect(normalizePhoneNumber('081234567890')).toBe('6281234567890');
    });
    it('should add 62 if not present', () => {
      expect(normalizePhoneNumber('81234567890')).toBe('6281234567890');
    });
    it('should keep 62 prefix as-is', () => {
      expect(normalizePhoneNumber('6281234567890')).toBe('6281234567890');
    });
    it('should strip non-digits', () => {
      expect(normalizePhoneNumber('+62 812-345-67890')).toBe('6281234567890');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should add + prefix', () => {
      expect(formatPhoneNumber('6281234567890')).toBe('+6281234567890');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should accept 10-13 digit numbers', () => {
      expect(isValidPhoneNumber('6281234567890')).toBe(true);
      expect(isValidPhoneNumber('081234567890')).toBe(true);
    });
    it('should reject too short', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
    });
    it('should reject too long', () => {
      expect(isValidPhoneNumber('62812345678901234')).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask middle with default visible 4', () => {
      const r = maskSensitiveData('081234567890');
      expect(r).toMatch(/^0812\*+7890$/);
    });
    it('should return all stars if length <= visibleChars*2', () => {
      expect(maskSensitiveData('1234', 4)).toBe('****');
    });
  });

  describe('generateTrackingCode', () => {
    it('should return default length 8', () => {
      const code = generateTrackingCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
    it('should respect custom length', () => {
      expect(generateTrackingCode(5)).toHaveLength(5);
    });
  });

  describe('formatCurrency', () => {
    it('should format IDR', () => {
      expect(formatCurrency(50000)).toMatch(/50\.?000/);
      expect(formatCurrency(50000)).toMatch(/Rp|IDR|50/);
    });
  });

  describe('formatDate', () => {
    it('should format Date and string', () => {
      const d = new Date('2026-01-24');
      expect(formatDate(d)).toMatch(/2026|24|Januari|January/);
      expect(formatDate('2026-01-24')).toMatch(/2026|24/);
    });
  });

  describe('formatDateTime', () => {
    it('should format as dd/mm/yy H:i', () => {
      const r = formatDateTime(new Date('2026-01-27T22:19:00Z'));
      expect(r).toMatch(/\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/);
    });
  });

  describe('generateSlug', () => {
    it('should lowercase and replace spaces with hyphens', () => {
      expect(generateSlug('Laundry ABC')).toBe('laundry-abc');
    });
    it('should remove special chars and trim', () => {
      expect(generateSlug('  Test  Outlet!  ')).toBe('test-outlet');
    });
    it('should collapse multiple hyphens', () => {
      expect(generateSlug('a   b')).toBe('a-b');
    });
  });
});
