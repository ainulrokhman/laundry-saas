/**
 * OutletDTO Tests
 * 
 * Tests for Outlet DTO pattern to ensure:
 * - Sensitive data is scrubbed
 * - Related data is properly transformed
 * - Array transformations work correctly
 */

import { describe, it, expect } from 'vitest';
import { OutletDTO } from '@/dto/OutletDTO';
import { Outlet, Role } from '@/generated/prisma';

describe('OutletDTO', () => {
  const mockOutlet: Outlet & { users?: any[]; bankAccounts?: any[]; paymentGatewayConfigs?: any[] } = {
    id: 'outlet-123',
    name: 'Laundry ABC',
    slug: 'laundry-abc',
    address: 'Jl. Test No. 123',
    isPro: false,
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
  };

  describe('toResponse', () => {
    it('should transform outlet to response format with all basic fields', () => {
      const result = OutletDTO.toResponse(mockOutlet);

      expect(result).toHaveProperty('id', 'outlet-123');
      expect(result).toHaveProperty('name', 'Laundry ABC');
      expect(result).toHaveProperty('slug', 'laundry-abc');
      expect(result).toHaveProperty('address', 'Jl. Test No. 123');
      expect(result).toHaveProperty('isPro', false);
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
    });

    it('should include users if available', () => {
      const outletWithUsers = {
        ...mockOutlet,
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            phone: '6281234567890',
            role: Role.OWNER,
            isActive: true,
            pin: 'hashed-pin',
            isPinSet: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
            pinChangedAt: null,
            outletId: 'outlet-123',
          },
          {
            id: 'user-2',
            name: 'Jane Smith',
            phone: '6289876543210',
            role: Role.STAFF,
            isActive: true,
            pin: 'hashed-pin',
            isPinSet: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
            pinChangedAt: null,
            outletId: 'outlet-123',
          },
        ],
      };
      const result = OutletDTO.toResponse(outletWithUsers);

      expect(result).toHaveProperty('users');
      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toEqual({
        id: 'user-1',
        name: 'John Doe',
        phone: '6281234567890',
        role: Role.OWNER,
        isActive: true,
      });
      expect(result.users[1]).toEqual({
        id: 'user-2',
        name: 'Jane Smith',
        phone: '6289876543210',
        role: Role.STAFF,
        isActive: true,
      });
      expect(result).toHaveProperty('userCount', 2);
    });

    it('should NOT include sensitive user fields', () => {
      const outletWithUsers = {
        ...mockOutlet,
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            phone: '6281234567890',
            role: Role.OWNER,
            isActive: true,
            pin: 'hashed-pin',
            isPinSet: true,
            failedLoginAttempts: 5,
            lockedUntil: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
            pinChangedAt: null,
            outletId: 'outlet-123',
          },
        ],
      };
      const result = OutletDTO.toResponse(outletWithUsers);

      expect(result.users[0]).not.toHaveProperty('pin');
      expect(result.users[0]).not.toHaveProperty('isPinSet');
      expect(result.users[0]).not.toHaveProperty('failedLoginAttempts');
      expect(result.users[0]).not.toHaveProperty('lockedUntil');
      expect(result.users[0]).not.toHaveProperty('createdAt');
      expect(result.users[0]).not.toHaveProperty('updatedAt');
    });

    it('should include bank accounts if available', () => {
      const outletWithBankAccounts = {
        ...mockOutlet,
        bankAccounts: [
          {
            id: 'bank-1',
            outletId: 'outlet-123',
            bankName: 'BCA',
            accountName: 'John Doe',
            accountNumber: '1234567890',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'bank-2',
            outletId: 'outlet-123',
            bankName: 'Mandiri',
            accountName: 'John Doe',
            accountNumber: '0987654321',
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const result = OutletDTO.toResponse(outletWithBankAccounts);

      expect(result).toHaveProperty('bankAccounts');
      expect(result.bankAccounts).toHaveLength(2);
      expect(result.bankAccounts[0]).toEqual({
        id: 'bank-1',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'John Doe',
        isActive: true,
      });
      expect(result).toHaveProperty('bankAccountCount', 2);
    });

    it('should include payment gateway configs if available', () => {
      const outletWithGateways = {
        ...mockOutlet,
        paymentGatewayConfigs: [
          {
            id: 'gateway-1',
            outletId: 'outlet-123',
            gatewayType: 'MIDTRANS' as any,
            isActive: true,
            apiKey: 'secret-key',
            secretKey: 'secret-secret',
            merchantId: 'merchant-123',
            webhookSecret: 'webhook-secret',
            config: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'gateway-2',
            outletId: 'outlet-123',
            gatewayType: 'XENDIT' as any,
            isActive: false,
            apiKey: 'secret-key-2',
            secretKey: null,
            merchantId: null,
            webhookSecret: null,
            config: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const result = OutletDTO.toResponse(outletWithGateways);

      expect(result).toHaveProperty('paymentGatewayConfigs');
      expect(result.paymentGatewayConfigs).toHaveLength(2);
      expect(result.paymentGatewayConfigs[0]).toEqual({
        id: 'gateway-1',
        gatewayType: 'MIDTRANS',
        isActive: true,
      });
      expect(result.paymentGatewayConfigs[1]).toEqual({
        id: 'gateway-2',
        gatewayType: 'XENDIT',
        isActive: false,
      });
      expect(result).toHaveProperty('paymentGatewayCount', 2);
    });

    it('should NOT include sensitive gateway fields', () => {
      const outletWithGateways = {
        ...mockOutlet,
        paymentGatewayConfigs: [
          {
            id: 'gateway-1',
            outletId: 'outlet-123',
            gatewayType: 'MIDTRANS' as any,
            isActive: true,
            apiKey: 'secret-key',
            secretKey: 'secret-secret',
            merchantId: 'merchant-123',
            webhookSecret: 'webhook-secret',
            config: { sensitive: 'data' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const result = OutletDTO.toResponse(outletWithGateways);

      expect(result.paymentGatewayConfigs[0]).not.toHaveProperty('apiKey');
      expect(result.paymentGatewayConfigs[0]).not.toHaveProperty('secretKey');
      expect(result.paymentGatewayConfigs[0]).not.toHaveProperty('merchantId');
      expect(result.paymentGatewayConfigs[0]).not.toHaveProperty('webhookSecret');
      expect(result.paymentGatewayConfigs[0]).not.toHaveProperty('config');
    });

    it('should handle outlet without relations', () => {
      const result = OutletDTO.toResponse(mockOutlet);

      expect(result).not.toHaveProperty('users');
      expect(result).not.toHaveProperty('bankAccounts');
      expect(result).not.toHaveProperty('paymentGatewayConfigs');
    });

    it('should handle isPro field (allowed for internal use)', () => {
      const proOutlet = { ...mockOutlet, isPro: true };
      const result = OutletDTO.toResponse(proOutlet);

      expect(result.isPro).toBe(true);
    });
  });

  describe('toResponseArray', () => {
    it('should transform array of outlets', () => {
      const outlets = [
        mockOutlet,
        { ...mockOutlet, id: 'outlet-456', name: 'Laundry XYZ', slug: 'laundry-xyz' },
      ];
      const result = OutletDTO.toResponseArray(outlets);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('outlet-123');
      expect(result[1].id).toBe('outlet-456');
      expect(result[1].name).toBe('Laundry XYZ');
    });

    it('should handle empty array', () => {
      const result = OutletDTO.toResponseArray([]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should include relations for all outlets', () => {
      const outlets = [
        { ...mockOutlet, users: [{ id: 'user-1', name: 'John', phone: '6281234567890', role: Role.OWNER, isActive: true }] },
        { ...mockOutlet, id: 'outlet-456', bankAccounts: [{ id: 'bank-1', bankName: 'BCA', accountNumber: '1234567890', accountName: 'John', isActive: true }] },
      ];
      const result = OutletDTO.toResponseArray(outlets);

      expect(result[0]).toHaveProperty('users');
      expect(result[1]).toHaveProperty('bankAccounts');
    });
  });

  describe('Data Scrubbing', () => {
    it('should ensure all dates are ISO strings', () => {
      const result = OutletDTO.toResponse(mockOutlet);

      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });

    it('should not expose internal database fields', () => {
      const outletWithExtraFields = {
        ...mockOutlet,
        _count: { users: 5, orders: 10 },
      } as any;
      const result = OutletDTO.toResponse(outletWithExtraFields);

      expect(result).not.toHaveProperty('_count');
    });
  });
});
