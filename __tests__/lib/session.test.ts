/**
 * Session utilities tests (src/lib/session.ts)
 * hasRole is pure; async helpers are tested with mocked auth.
 */

import { vi } from 'vitest';
import { Role } from '@/generated/prisma';
import { hasRole } from '@/lib/session';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

describe('session', () => {
  describe('hasRole', () => {
    it('should return false when userRole is undefined', () => {
      expect(hasRole(undefined, Role.OWNER)).toBe(false);
    });

    it('should accept single required role', () => {
      expect(hasRole(Role.SUPERADMIN, Role.SUPERADMIN)).toBe(true);
      expect(hasRole(Role.OWNER, Role.OWNER)).toBe(true);
      expect(hasRole(Role.STAFF, Role.STAFF)).toBe(true);
    });

    it('should accept array of required roles', () => {
      expect(hasRole(Role.OWNER, [Role.OWNER, Role.STAFF])).toBe(true);
      expect(hasRole(Role.STAFF, [Role.OWNER, Role.STAFF])).toBe(true);
      expect(hasRole(Role.STAFF, [Role.OWNER])).toBe(false);
    });

    it('should respect hierarchy: SUPERADMIN >= OWNER >= STAFF', () => {
      expect(hasRole(Role.SUPERADMIN, Role.OWNER)).toBe(true);
      expect(hasRole(Role.SUPERADMIN, Role.STAFF)).toBe(true);
      expect(hasRole(Role.OWNER, Role.STAFF)).toBe(true);
      expect(hasRole(Role.OWNER, Role.SUPERADMIN)).toBe(false);
      expect(hasRole(Role.STAFF, Role.OWNER)).toBe(false);
      expect(hasRole(Role.STAFF, Role.SUPERADMIN)).toBe(false);
    });
  });
});
