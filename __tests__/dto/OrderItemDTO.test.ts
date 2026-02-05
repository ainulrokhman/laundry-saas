/**
 * OrderItemDTO Tests
 */

import { OrderItemDTO } from '@/dto/OrderItemDTO';
import { OrderItem } from '@/generated/prisma';

describe('OrderItemDTO', () => {
  const mockItem: OrderItem = {
    id: 'item-1',
    orderId: 'order-1',
    serviceId: 'svc-1',
    serviceName: 'Cuci Kiloan',
    serviceType: 'KILOAN',
    serviceUnit: 'kg',
    quantity: 2,
    unitPrice: 10000,
    subtotal: 20000,
    createdAt: new Date('2026-01-24T10:00:00Z'),
    updatedAt: new Date('2026-01-24T10:00:00Z'),
  };

  describe('toResponse', () => {
    it('should transform order item to response', () => {
      const result = OrderItemDTO.toResponse(mockItem);

      expect(result).toHaveProperty('id', 'item-1');
      expect(result).toHaveProperty('orderId', 'order-1');
      expect(result).toHaveProperty('serviceId', 'svc-1');
      expect(result).toHaveProperty('serviceName', 'Cuci Kiloan');
      expect(result).toHaveProperty('serviceType', 'KILOAN');
      expect(result).toHaveProperty('serviceUnit', 'kg');
      expect(result).toHaveProperty('quantity', 2);
      expect(result).toHaveProperty('unitPrice', 10000);
      expect(result).toHaveProperty('subtotal', 20000);
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-24T10:00:00.000Z');
    });

    it('should handle null serviceId and serviceUnit', () => {
      const item = { ...mockItem, serviceId: null, serviceUnit: null };
      const result = OrderItemDTO.toResponse(item);
      expect(result.serviceId).toBeNull();
      expect(result.serviceUnit).toBeNull();
    });
  });

  describe('toResponseArray', () => {
    it('should transform array', () => {
      const list = [mockItem, { ...mockItem, id: 'item-2' }];
      const result = OrderItemDTO.toResponseArray(list);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item-1');
      expect(result[1].id).toBe('item-2');
    });
  });
});
