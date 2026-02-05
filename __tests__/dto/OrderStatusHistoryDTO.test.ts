/**
 * OrderStatusHistoryDTO Tests
 * toResponse masks changedByUser.phone
 */

import { OrderStatusHistoryDTO, OrderStatusHistoryWithUser } from '@/dto/OrderStatusHistoryDTO';

describe('OrderStatusHistoryDTO', () => {
  const mockRow: OrderStatusHistoryWithUser = {
    id: 'hist-1',
    orderId: 'order-1',
    fromStatus: 'QUEUED',
    toStatus: 'WASHING',
    createdAt: new Date('2026-01-24T10:00:00Z'),
    changedById: 'user-1',
    changedByUser: {
      id: 'user-1',
      name: 'Staff A',
      phone: '6281234567890',
    },
  };

  describe('toResponse', () => {
    it('should transform and mask phone in changedByUser', () => {
      const result = OrderStatusHistoryDTO.toResponse(mockRow);

      expect(result).toHaveProperty('id', 'hist-1');
      expect(result).toHaveProperty('fromStatus', 'QUEUED');
      expect(result).toHaveProperty('toStatus', 'WASHING');
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
      expect(result.changedByUser).toEqual({
        id: 'user-1',
        name: 'Staff A',
        phone: '6281****7890',
      });
    });

    it('should handle null changedByUser', () => {
      const row = { ...mockRow, changedByUser: null };
      const result = OrderStatusHistoryDTO.toResponse(row);
      expect(result.changedByUser).toBeNull();
    });
  });

  describe('toResponseArray', () => {
    it('should transform array', () => {
      const list = [mockRow];
      const result = OrderStatusHistoryDTO.toResponseArray(list);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hist-1');
    });
  });
});
