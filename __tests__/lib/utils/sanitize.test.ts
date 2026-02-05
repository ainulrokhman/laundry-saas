/**
 * Sanitize utilities tests (src/lib/utils/sanitize.ts)
 */

import {
  sanitizeString,
  sanitizePhone,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeUrl,
  sanitizeObject,
  sanitizeHtml,
} from '@/lib/utils/sanitize';

describe('sanitize', () => {
  describe('sanitizeString', () => {
    it('should trim and return empty for null/undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
    it('should remove null bytes and control chars', () => {
      expect(sanitizeString('a\x00b')).toBe('ab');
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
  });

  describe('sanitizePhone', () => {
    it('should keep digits and leading +', () => {
      expect(sanitizePhone('+62 812 345 67890')).toBe('+6281234567890');
    });
    it('should return empty for null/undefined', () => {
      expect(sanitizePhone(null)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should lowercase and allow @ . - word chars', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
      expect(sanitizeEmail('a@b.co')).toBe('a@b.co');
    });
    it('should return empty for null/undefined', () => {
      expect(sanitizeEmail(null)).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse number from string', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber('12.5')).toBe(12.5);
    });
    it('should return 0 for invalid or null', () => {
      expect(sanitizeNumber(null)).toBe(0);
      expect(sanitizeNumber('abc')).toBe(0);
    });
    it('should pass through valid number', () => {
      expect(sanitizeNumber(42)).toBe(42);
    });
  });

  describe('sanitizeInteger', () => {
    it('should floor number', () => {
      expect(sanitizeInteger(3.7)).toBe(3);
      expect(sanitizeInteger('3.7')).toBe(3);
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http and https', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://a.b')).toBe('http://a.b');
    });
    it('should return empty for javascript: protocol (remainder is not valid URL)', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });
    it('should return empty for invalid url', () => {
      expect(sanitizeUrl('not-a-url')).toBe('');
    });
    it('should return empty for null/undefined', () => {
      expect(sanitizeUrl(null)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should recursively sanitize string values', () => {
      const obj = { a: '  x  ', b: { c: 'y' } };
      const out = sanitizeObject(obj);
      expect(out.a).toBe('x');
      expect(out.b.c).toBe('y');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<p>Ok</p><script>evil()</script>';
      expect(sanitizeHtml(html)).not.toContain('<script>');
    });
    it('should return empty for null/undefined', () => {
      expect(sanitizeHtml(null)).toBe('');
    });
  });
});
