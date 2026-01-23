/**
 * Outlet Utilities Tests
 * 
 * Critical tests for outlet filtering utility functions (multi-tenancy)
 */

import { describe, it, expect } from 'vitest';
import {
  requireOutletIdFromSession,
  validateOutletId,
  combineOutletFilter,
} from '@/lib/outlet';
import { SessionUser } from '@/lib/session';
import { Role } from '@/generated/prisma';

describe('Outlet Utilities (Multi-tenancy Critical)', () => {
  const mockUser: SessionUser = {
    userId: 'user-1',
    outletId: 'outlet-123',
    role: Role.OWNER,
    phone: '6281234567890',
  };

  it('should require outletId from session (critical for multi-tenancy)', () => {
    const outletId = requireOutletIdFromSession(mockUser);
    expect(outletId).toBe('outlet-123');

    expect(() => {
      requireOutletIdFromSession(null);
    }).toThrow('Authentication required');

    expect(() => {
      requireOutletIdFromSession({ ...mockUser, outletId: null });
    }).toThrow('Outlet context required');
  });

  it('should validate outletId (critical for data isolation)', () => {
    expect(validateOutletId('outlet-123')).toBe('outlet-123');
    
    expect(() => {
      validateOutletId(null);
    }).toThrow('Operation requires outletId for multi-tenancy isolation');
  });

  it('should combine outlet filter with additional filters (critical for queries)', () => {
    const result = combineOutletFilter('outlet-123', {
      isActive: true,
      status: 'ACTIVE',
    });

    expect(result).toEqual({
      outletId: 'outlet-123',
      isActive: true,
      status: 'ACTIVE',
    });

    expect(() => {
      combineOutletFilter('', { name: 'Test' });
    }).toThrow('Outlet ID is required for multi-tenancy isolation');
  });
});
