/**
 * OrderDTO Tests
 * 
 * Tests for Order DTO pattern to ensure:
 * - Sensitive data is scrubbed
 * - Phone numbers are masked
 * - Public responses are minimal
 * - Array transformations work correctly
 */

import { OrderDTO, OrderWithRelations } from '@/dto/OrderDTO';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@/generated/prisma';

describe('OrderDTO', () => {
  const mockOrder: OrderWithRelations = {
    id: 'order-123',
    trackingCode: 'ABC12345',
    status: OrderStatus.WASHING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.TRANSFER,
    totalAmount: 50000,
    outletId: 'outlet-123',
    customerName: 'John Doe',
    customerPhone: '6281234567890',
    notes: 'Handle with care',
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
    completedAt: null,
  };

  describe('toResponse', () => {
    it('should transform order to response format with all fields', () => {
      const result = OrderDTO.toResponse(mockOrder);

      expect(result).toHaveProperty('id', 'order-123');
      expect(result).toHaveProperty('trackingCode', 'ABC12345');
      expect(result).toHaveProperty('status', OrderStatus.WASHING);
      expect(result).toHaveProperty('paymentStatus', PaymentStatus.PENDING);
      expect(result).toHaveProperty('paymentMethod', PaymentMethod.TRANSFER);
      expect(result).toHaveProperty('totalAmount', 50000);
      expect(result).toHaveProperty('customerName', 'John Doe');
      expect(result).toHaveProperty('notes', 'Handle with care');
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.completedAt).toBeNull();
    });

    it('should mask phone number in response', () => {
      const result = OrderDTO.toResponse(mockOrder);

      expect(result.customerPhone).toBe('6281****7890');
      expect(result.customerPhone).not.toBe('6281234567890');
    });

    it('should handle null phone number', () => {
      const orderWithoutPhone = { ...mockOrder, customerPhone: null };
      const result = OrderDTO.toResponse(orderWithoutPhone);

      expect(result.customerPhone).toBeNull();
    });

    it('should handle short phone number (<= 4 chars)', () => {
      const orderWithShortPhone = { ...mockOrder, customerPhone: '1234' };
      const result = OrderDTO.toResponse(orderWithShortPhone);

      expect(result.customerPhone).toBe('****');
    });

    it('should include outlet info if available', () => {
      const orderWithOutlet = {
        ...mockOrder,
        outlet: {
          id: 'outlet-123',
          name: 'Laundry ABC',
          slug: 'laundry-abc',
        },
      };
      const result = OrderDTO.toResponse(orderWithOutlet);

      expect(result).toHaveProperty('outlet');
      expect(result.outlet).toEqual({
        id: 'outlet-123',
        name: 'Laundry ABC',
        slug: 'laundry-abc',
      });
    });

    it('should include transaction summary if available', () => {
      const orderWithTransactions = {
        ...mockOrder,
        transactions: [
          {
            id: 'tx-1',
            amount: 50000,
            paymentMethod: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING,
          },
        ],
      };
      const result = OrderDTO.toResponse(orderWithTransactions);

      expect(result).toHaveProperty('transactions');
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual({
        id: 'tx-1',
        amount: 50000,
        paymentMethod: PaymentMethod.TRANSFER,
        status: PaymentStatus.PENDING,
      });
    });

    it('should not include outletId in response', () => {
      const result = OrderDTO.toResponse(mockOrder);

      expect(result).not.toHaveProperty('outletId');
    });

    it('should handle null customerName', () => {
      const orderWithoutName = { ...mockOrder, customerName: null };
      const result = OrderDTO.toResponse(orderWithoutName);

      expect(result.customerName).toBeNull();
    });

    it('should handle null notes', () => {
      const orderWithoutNotes = { ...mockOrder, notes: null };
      const result = OrderDTO.toResponse(orderWithoutNotes);

      expect(result.notes).toBeNull();
    });

    it('should handle completedAt date', () => {
      const completedOrder = {
        ...mockOrder,
        completedAt: new Date('2026-01-25T15:00:00Z'),
      };
      const result = OrderDTO.toResponse(completedOrder);

      expect(result.completedAt).toBe('2026-01-25T15:00:00.000Z');
    });
  });

  describe('toPublicResponse', () => {
    it('should return minimal data for public tracking', () => {
      const result = OrderDTO.toPublicResponse(mockOrder);

      expect(result).toHaveProperty('trackingCode', 'ABC12345');
      expect(result).toHaveProperty('status', OrderStatus.WASHING);
      expect(result).toHaveProperty('paymentStatus', PaymentStatus.PENDING);
      expect(result).toHaveProperty('totalAmount', 50000);
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('completedAt');
    });

    it('should mask customer name in public response', () => {
      const result = OrderDTO.toPublicResponse(mockOrder);

      expect(result.customerName).toBe('Jo***');
      expect(result.customerName).not.toBe('John Doe');
    });

    it('should handle short customer name (<= 2 chars)', () => {
      const orderWithShortName = { ...mockOrder, customerName: 'Jo' };
      const result = OrderDTO.toPublicResponse(orderWithShortName);

      expect(result.customerName).toBe('***');
    });

    it('should handle null customer name', () => {
      const orderWithoutName = { ...mockOrder, customerName: null };
      const result = OrderDTO.toPublicResponse(orderWithoutName);

      expect(result.customerName).toBeNull();
    });

    it('should include outlet name if available', () => {
      const orderWithOutlet = {
        ...mockOrder,
        outlet: {
          id: 'outlet-123',
          name: 'Laundry ABC',
          slug: 'laundry-abc',
        },
      };
      const result = OrderDTO.toPublicResponse(orderWithOutlet);

      expect(result).toHaveProperty('outletName', 'Laundry ABC');
    });

    it('should NOT include sensitive fields in public response', () => {
      const result = OrderDTO.toPublicResponse(mockOrder);

      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('outletId');
      expect(result).not.toHaveProperty('customerPhone');
      expect(result).not.toHaveProperty('notes');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('paymentMethod');
    });
  });

  describe('toResponseArray', () => {
    it('should transform array of orders', () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-456', trackingCode: 'XYZ67890' }];
      const result = OrderDTO.toResponseArray(orders);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-123');
      expect(result[1].id).toBe('order-456');
    });

    it('should handle empty array', () => {
      const result = OrderDTO.toResponseArray([]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should mask phone numbers in all orders', () => {
      const orders = [
        { ...mockOrder, customerPhone: '6281111111111' },
        { ...mockOrder, customerPhone: '6282222222222' },
      ];
      const result = OrderDTO.toResponseArray(orders);

      expect(result[0].customerPhone).toBe('6281****1111');
      expect(result[1].customerPhone).toBe('6282****2222');
    });
  });

  describe('Data Scrubbing', () => {
    it('should not expose internal database fields', () => {
      const orderWithExtraFields = {
        ...mockOrder,
        // Simulate extra fields that might come from Prisma
        _count: { transactions: 5 },
        outlet: undefined,
      } as any;
      const result = OrderDTO.toResponse(orderWithExtraFields);

      expect(result).not.toHaveProperty('_count');
      expect(result).not.toHaveProperty('outletId');
    });

    it('should ensure all dates are ISO strings', () => {
      const result = OrderDTO.toResponse(mockOrder);

      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });
  });
});
