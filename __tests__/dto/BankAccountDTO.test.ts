/**
 * BankAccountDTO Tests
 * toResponse, toPublicResponse, toResponseArray, toPublicResponseArray
 */

import { BankAccountDTO, BankAccountWithRelations } from '@/dto/BankAccountDTO';

describe('BankAccountDTO', () => {
  const mockBankAccount: BankAccountWithRelations = {
    id: 'bank-1',
    outletId: 'outlet-1',
    bankName: 'BCA',
    accountName: 'Rekening Laundry',
    accountNumber: '1234567890',
    isActive: true,
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
  };

  describe('toResponse', () => {
    it('should transform bank account to response format', () => {
      const result = BankAccountDTO.toResponse(mockBankAccount);

      expect(result).toHaveProperty('id', 'bank-1');
      expect(result).toHaveProperty('bankName', 'BCA');
      expect(result).toHaveProperty('accountName', 'Rekening Laundry');
      expect(result).toHaveProperty('accountNumber', '1234567890');
      expect(result).toHaveProperty('isActive', true);
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
    });

    it('should include outlet info when available', () => {
      const withOutlet = {
        ...mockBankAccount,
        outlet: { id: 'outlet-1', name: 'Laundry ABC', slug: 'laundry-abc' },
      };
      const result = BankAccountDTO.toResponse(withOutlet);

      expect(result).toHaveProperty('outlet');
      expect(result.outlet).toEqual({
        id: 'outlet-1',
        name: 'Laundry ABC',
        slug: 'laundry-abc',
      });
    });
  });

  describe('toPublicResponse', () => {
    it('should return minimal data for active bank account', () => {
      const result = BankAccountDTO.toPublicResponse(mockBankAccount);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 'bank-1');
      expect(result).toHaveProperty('bankName', 'BCA');
      expect(result).toHaveProperty('accountName', 'Rekening Laundry');
      expect(result).toHaveProperty('accountNumber', '1234567890');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('outletId');
    });

    it('should return null for inactive bank account', () => {
      const inactive = { ...mockBankAccount, isActive: false };
      const result = BankAccountDTO.toPublicResponse(inactive);

      expect(result).toBeNull();
    });
  });

  describe('toResponseArray', () => {
    it('should transform array of bank accounts', () => {
      const list = [
        mockBankAccount,
        { ...mockBankAccount, id: 'bank-2', accountNumber: '999' },
      ];
      const result = BankAccountDTO.toResponseArray(list);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bank-1');
      expect(result[1].id).toBe('bank-2');
    });

    it('should handle empty array', () => {
      const result = BankAccountDTO.toResponseArray([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('toPublicResponseArray', () => {
    it('should filter out inactive accounts', () => {
      const list = [
        mockBankAccount,
        { ...mockBankAccount, id: 'bank-2', isActive: false },
      ];
      const result = BankAccountDTO.toPublicResponseArray(list);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bank-1');
    });
  });
});
