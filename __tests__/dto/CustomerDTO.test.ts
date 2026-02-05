/**
 * CustomerDTO Tests
 * toResponse, toResponseWithOrders, toResponseList
 */

import { CustomerDTO } from '@/dto/CustomerDTO';
import { Customer } from '@/generated/prisma';

describe('CustomerDTO', () => {
  const mockCustomer: Customer & { _count?: { orders: number } } = {
    id: 'cust-1',
    outletId: 'outlet-1',
    name: 'Budi Santoso',
    phone: '6281234567890',
    email: 'budi@example.com',
    address: 'Jl. Contoh No. 1',
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
    _count: { orders: 3 },
  };

  describe('toResponse', () => {
    it('should transform customer to response format', () => {
      const result = CustomerDTO.toResponse(mockCustomer);

      expect(result).toHaveProperty('id', 'cust-1');
      expect(result).toHaveProperty('outletId', 'outlet-1');
      expect(result).toHaveProperty('name', 'Budi Santoso');
      expect(result).toHaveProperty('phone', '6281234567890');
      expect(result).toHaveProperty('email', 'budi@example.com');
      expect(result).toHaveProperty('address', 'Jl. Contoh No. 1');
      expect(result).toHaveProperty('_count', { orders: 3 });
    });
  });

  describe('toResponseWithOrders', () => {
    it('should include orders when present', () => {
      const withOrders = {
        ...mockCustomer,
        orders: [
          {
            id: 'ord-1',
            trackingCode: 'ABC123',
            status: 'QUEUED',
            paymentStatus: 'UNPAID',
            totalAmount: 50000,
            createdAt: new Date(),
            completedAt: null,
          },
        ],
      };
      const result = CustomerDTO.toResponseWithOrders(withOrders);

      expect(result).toHaveProperty('orders');
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]).toMatchObject({
        id: 'ord-1',
        trackingCode: 'ABC123',
        status: 'QUEUED',
        paymentStatus: 'UNPAID',
        totalAmount: 50000,
      });
    });

    it('should return empty orders array when orders missing', () => {
      const result = CustomerDTO.toResponseWithOrders(mockCustomer);
      expect(result.orders).toEqual([]);
    });
  });

  describe('toResponseList', () => {
    it('should transform array of customers', () => {
      const list = [
        mockCustomer,
        { ...mockCustomer, id: 'cust-2', name: 'Ani' },
      ];
      const result = CustomerDTO.toResponseList(list);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cust-1');
      expect(result[1].id).toBe('cust-2');
    });
  });
});
