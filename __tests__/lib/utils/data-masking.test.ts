/**
 * Data masking utilities tests (src/lib/utils/data-masking.ts)
 */

import { maskPhone, maskEmail, maskString, scrubSensitive } from '@/lib/utils/data-masking';

describe('data-masking', () => {
  describe('maskPhone', () => {
    it('should mask middle with 4 start and 3 end', () => {
      expect(maskPhone('6281234567890')).toBe('6281***7890');
    });
    it('should return *** for null/undefined/empty', () => {
      expect(maskPhone(null)).toBe('***');
      expect(maskPhone(undefined)).toBe('***');
      expect(maskPhone('')).toBe('***');
    });
    it('should strip non-digits before masking', () => {
      expect(maskPhone('62-812-345-67890')).toBe('6281***7890');
    });
    it('should handle short phone', () => {
      expect(maskPhone('1234')).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('should show first 2 chars and domain', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
    });
    it('should return *** for invalid or empty', () => {
      expect(maskEmail('')).toBe('***');
      expect(maskEmail(null)).toBe('***');
      expect(maskEmail('no-at-sign')).toBe('***');
    });
    it('should handle short local part', () => {
      expect(maskEmail('a@x.com')).toBe('a***@x.com');
    });
  });

  describe('maskString', () => {
    it('should show visibleStart by default', () => {
      expect(maskString('hello', 2, 0)).toBe('he***');
    });
    it('should show visibleEnd when set', () => {
      expect(maskString('hello', 1, 1)).toBe('h***o');
    });
    it('should return *** for null/undefined', () => {
      expect(maskString(null)).toBe('***');
      expect(maskString(undefined)).toBe('***');
    });
  });

  describe('scrubSensitive', () => {
    it('should redact known sensitive keys', () => {
      const obj = { user: 'x', password: 'secret', pin: '1234' };
      const out = scrubSensitive(obj);
      expect(out.user).toBe('x');
      expect(out.password).toBe('[REDACTED]');
      expect(out.pin).toBe('[REDACTED]');
    });
    it('should be case-insensitive for key names', () => {
      const obj = { API_KEY: 'abc' };
      const out = scrubSensitive(obj);
      expect(out.API_KEY).toBe('[REDACTED]');
    });
    it('should recurse into nested objects', () => {
      const obj = { a: { b: { token: 'xyz' } } };
      const out = scrubSensitive(obj);
      expect((out as any).a.b.token).toBe('[REDACTED]');
    });
    it('should return same object for non-object input', () => {
      expect(scrubSensitive(null as any)).toBeNull();
    });
  });
});
