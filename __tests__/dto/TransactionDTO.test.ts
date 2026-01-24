/**
 * TransactionDTO Tests
 * 
 * Tests for Transaction DTO pattern to ensure:
 * - Sensitive data is scrubbed (gatewayResponse, webhookData)
 * - Account numbers are masked
 * - Admin response includes more details
 * - Array transformations work correctly
 */

import { describe, it, expect } from 'vitest';
import { TransactionDTO, TransactionWithRelations } from '@/dto/TransactionDTO';
import { PaymentStatus, PaymentMethod, TransType } from '@/generated/prisma';

describe('TransactionDTO', () => {
  const mockTransaction: TransactionWithRelations = {
    id: 'tx-123',
    type: TransType.LAUNDRY_ORDER,
    amount: 50000,
    paymentMethod: PaymentMethod.TRANSFER,
    status: PaymentStatus.PENDING,
    externalId: 'ext-123',
    gatewayTransactionId: 'gateway-tx-123',
    proofUrl: 'https://cloudinary.com/proof.jpg',
    orderId: 'order-123',
    outletId: 'outlet-123',
    bankAccountId: 'bank-123',
    paymentGatewayConfigId: null,
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
    verifiedAt: null,
    gatewayResponse: { sensitive: 'data' } as any,
    webhookData: { secret: 'info' } as any,
  };

  describe('toResponse', () => {
    it('should transform transaction to response format with all fields', () => {
      const result = TransactionDTO.toResponse(mockTransaction);

      expect(result).toHaveProperty('id', 'tx-123');
      expect(result).toHaveProperty('type', TransType.LAUNDRY_ORDER);
      expect(result).toHaveProperty('amount', 50000);
      expect(result).toHaveProperty('paymentMethod', PaymentMethod.TRANSFER);
      expect(result).toHaveProperty('status', PaymentStatus.PENDING);
      expect(result).toHaveProperty('externalId', 'ext-123');
      expect(result).toHaveProperty('gatewayTransactionId', 'gateway-tx-123');
      expect(result).toHaveProperty('proofUrl', 'https://cloudinary.com/proof.jpg');
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.verifiedAt).toBeNull();
    });

    it('should NOT include sensitive gatewayResponse and webhookData', () => {
      const result = TransactionDTO.toResponse(mockTransaction);

      expect(result).not.toHaveProperty('gatewayResponse');
      expect(result).not.toHaveProperty('webhookData');
    });

    it('should mask bank account number', () => {
      const transactionWithBank = {
        ...mockTransaction,
        bankAccount: {
          id: 'bank-123',
          bankName: 'BCA',
          accountNumber: '1234567890',
          accountName: 'John Doe',
        },
      };
      const result = TransactionDTO.toResponse(transactionWithBank);

      expect(result).toHaveProperty('bankAccount');
      expect(result.bankAccount?.accountNumber).toBe('1234****7890');
      expect(result.bankAccount?.accountNumber).not.toBe('1234567890');
    });

    it('should handle short account number (<= 4 chars)', () => {
      const transactionWithShortAccount = {
        ...mockTransaction,
        bankAccount: {
          id: 'bank-123',
          bankName: 'BCA',
          accountNumber: '1234',
          accountName: 'John Doe',
        },
      };
      const result = TransactionDTO.toResponse(transactionWithShortAccount);

      expect(result.bankAccount?.accountNumber).toBe('****');
    });

    it('should include order info if available', () => {
      const transactionWithOrder = {
        ...mockTransaction,
        order: {
          id: 'order-123',
          trackingCode: 'ABC12345',
          customerName: 'John Doe',
        },
      };
      const result = TransactionDTO.toResponse(transactionWithOrder);

      expect(result).toHaveProperty('order');
      expect(result.order).toEqual({
        id: 'order-123',
        trackingCode: 'ABC12345',
        customerName: 'John Doe',
      });
    });

    it('should include payment gateway info if available (minimal)', () => {
      const transactionWithGateway = {
        ...mockTransaction,
        paymentGatewayConfig: {
          id: 'gateway-123',
          gatewayType: PaymentMethod.MIDTRANS,
          isActive: true,
        },
      };
      const result = TransactionDTO.toResponse(transactionWithGateway);

      expect(result).toHaveProperty('paymentGateway');
      expect(result.paymentGateway).toEqual({
        id: 'gateway-123',
        gatewayType: PaymentMethod.MIDTRANS,
        isActive: true,
      });
      // Should not include sensitive keys
      expect(result.paymentGateway).not.toHaveProperty('apiKey');
      expect(result.paymentGateway).not.toHaveProperty('secretKey');
    });

    it('should handle null values', () => {
      const transactionWithNulls = {
        ...mockTransaction,
        externalId: null,
        gatewayTransactionId: null,
        proofUrl: null,
        order: undefined,
        bankAccount: undefined,
        paymentGatewayConfig: undefined,
      };
      const result = TransactionDTO.toResponse(transactionWithNulls);

      expect(result.externalId).toBeNull();
      expect(result.gatewayTransactionId).toBeNull();
      expect(result.proofUrl).toBeNull();
      expect(result).not.toHaveProperty('order');
      expect(result).not.toHaveProperty('bankAccount');
      expect(result).not.toHaveProperty('paymentGateway');
    });

    it('should handle verifiedAt date', () => {
      const verifiedTransaction = {
        ...mockTransaction,
        verifiedAt: new Date('2026-01-25T15:00:00Z'),
      };
      const result = TransactionDTO.toResponse(verifiedTransaction);

      expect(result.verifiedAt).toBe('2026-01-25T15:00:00.000Z');
    });

    it('should not include internal IDs in response', () => {
      const result = TransactionDTO.toResponse(mockTransaction);

      expect(result).not.toHaveProperty('orderId');
      expect(result).not.toHaveProperty('outletId');
      expect(result).not.toHaveProperty('bankAccountId');
      expect(result).not.toHaveProperty('paymentGatewayConfigId');
    });
  });

  describe('toAdminResponse', () => {
    it('should include all fields from toResponse', () => {
      const result = TransactionDTO.toAdminResponse(mockTransaction);

      expect(result).toHaveProperty('id', 'tx-123');
      expect(result).toHaveProperty('type', TransType.LAUNDRY_ORDER);
      expect(result).toHaveProperty('amount', 50000);
    });

    it('should include full bank account number (not masked) for admin', () => {
      const transactionWithBank = {
        ...mockTransaction,
        bankAccount: {
          id: 'bank-123',
          bankName: 'BCA',
          accountNumber: '1234567890',
          accountName: 'John Doe',
        },
      };
      const result = TransactionDTO.toAdminResponse(transactionWithBank);

      expect(result.bankAccount?.accountNumber).toBe('1234567890');
      expect(result.bankAccount?.accountNumber).not.toBe('1234****7890');
    });

    it('should include gatewayTransactionId for admin', () => {
      const result = TransactionDTO.toAdminResponse(mockTransaction);

      expect(result.gatewayTransactionId).toBe('gateway-tx-123');
    });

    it('should include externalId for admin', () => {
      const result = TransactionDTO.toAdminResponse(mockTransaction);

      expect(result.externalId).toBe('ext-123');
    });

    it('should still NOT include sensitive gatewayResponse and webhookData', () => {
      const result = TransactionDTO.toAdminResponse(mockTransaction);

      expect(result).not.toHaveProperty('gatewayResponse');
      expect(result).not.toHaveProperty('webhookData');
    });
  });

  describe('toResponseArray', () => {
    it('should transform array of transactions', () => {
      const transactions = [
        mockTransaction,
        { ...mockTransaction, id: 'tx-456', amount: 75000 },
      ];
      const result = TransactionDTO.toResponseArray(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tx-123');
      expect(result[1].id).toBe('tx-456');
      expect(result[1].amount).toBe(75000);
    });

    it('should handle empty array', () => {
      const result = TransactionDTO.toResponseArray([]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should mask account numbers in all transactions', () => {
      const transactions = [
        {
          ...mockTransaction,
          bankAccount: {
            id: 'bank-1',
            bankName: 'BCA',
            accountNumber: '1111111111',
            accountName: 'John',
          },
        },
        {
          ...mockTransaction,
          bankAccount: {
            id: 'bank-2',
            bankName: 'Mandiri',
            accountNumber: '2222222222',
            accountName: 'Jane',
          },
        },
      ];
      const result = TransactionDTO.toResponseArray(transactions);

      expect(result[0].bankAccount?.accountNumber).toBe('1111****1111');
      expect(result[1].bankAccount?.accountNumber).toBe('2222****2222');
    });
  });

  describe('Data Scrubbing', () => {
    it('should ensure all dates are ISO strings', () => {
      const result = TransactionDTO.toResponse(mockTransaction);

      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });

    it('should not expose internal database fields', () => {
      const transactionWithExtraFields = {
        ...mockTransaction,
        _count: { orders: 1 },
        outlet: undefined,
      } as any;
      const result = TransactionDTO.toResponse(transactionWithExtraFields);

      expect(result).not.toHaveProperty('_count');
      expect(result).not.toHaveProperty('outletId');
    });
  });
});
