/**
 * UserDTO Tests
 * toResponse, toResponseArray, roleLabel; ensure pin and sensitive fields are scrubbed
 */

import { UserDTO } from '@/dto/UserDTO';
import { Role } from '@/generated/prisma';

describe('UserDTO', () => {
  const mockUser = {
    id: 'user-1',
    phone: '6281234567890',
    name: 'Test User',
    pin: '$2a$10$secret.hash',
    role: Role.OWNER,
    outletId: 'outlet-1',
    isActive: true,
    isPinSet: true,
    pinChangedAt: new Date('2026-01-20T00:00:00Z'),
    lastLoginAt: new Date('2026-01-24T08:00:00Z'),
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
    outlet: {
      id: 'outlet-1',
      name: 'Laundry ABC',
      slug: 'laundry-abc',
    },
  };

  describe('toResponse', () => {
    it('should transform user to response and scrub sensitive fields', () => {
      const result = UserDTO.toResponse(mockUser as any);

      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('phone', '6281234567890');
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('role', Role.OWNER);
      expect(result).toHaveProperty('outletId', 'outlet-1');
      expect(result).toHaveProperty('isActive', true);
      expect(result.lastLoginAt).toBe('2026-01-24T08:00:00.000Z');
      expect(result.pinChangedAt).toBe('2026-01-20T00:00:00.000Z');
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result).not.toHaveProperty('pin');
      expect(result).not.toHaveProperty('isPinSet');
      expect(result).not.toHaveProperty('failedLoginAttempts');
      expect(result).not.toHaveProperty('lockedUntil');
    });

    it('should include outlet when present', () => {
      const result = UserDTO.toResponse(mockUser as any);
      expect(result.outlet).toEqual({
        id: 'outlet-1',
        name: 'Laundry ABC',
        slug: 'laundry-abc',
      });
    });

    it('should handle null lastLoginAt and pinChangedAt', () => {
      const userNoDates = { ...mockUser, lastLoginAt: null, pinChangedAt: null };
      const result = UserDTO.toResponse(userNoDates as any);
      expect(result.lastLoginAt).toBeNull();
      expect(result.pinChangedAt).toBeNull();
    });

    it('should handle null outlet', () => {
      const userNoOutlet = { ...mockUser, outlet: null };
      const result = UserDTO.toResponse(userNoOutlet as any);
      expect(result.outlet).toBeNull();
    });
  });

  describe('toResponseArray', () => {
    it('should transform array of users', () => {
      const list = [mockUser, { ...mockUser, id: 'user-2', name: 'User 2' }];
      const result = UserDTO.toResponseArray(list as any);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-2');
    });
  });

  describe('roleLabel', () => {
    it('should return correct labels for each role', () => {
      expect(UserDTO.roleLabel(Role.SUPERADMIN)).toBe('SuperAdmin');
      expect(UserDTO.roleLabel(Role.OWNER)).toBe('Owner');
      expect(UserDTO.roleLabel(Role.STAFF)).toBe('Staff');
    });

    it('should return role as-is for unknown', () => {
      expect(UserDTO.roleLabel('UNKNOWN' as Role)).toBe('UNKNOWN');
    });
  });
});
