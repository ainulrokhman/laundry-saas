/**
 * DashboardDTO Tests
 * 
 * Tests for Dashboard DTO pattern to ensure:
 * - Stats are correctly transformed
 * - Recent orders are properly formatted
 * - Sensitive data is not exposed
 */

import { DashboardDTO } from '@/dto/DashboardDTO';
import { DashboardStats, RecentOrder } from '@/services/DashboardService';
import { OrderStatus, PaymentStatus } from '@/generated/prisma';

describe('DashboardDTO', () => {
  describe('statsToResponse', () => {
    it('should transform dashboard stats to response format', () => {
      const stats: DashboardStats = {
        ordersToday: 10,
        revenueToday: 500000,
        pendingOrders: 5,
        totalCustomers: 25,
      };

      const result = DashboardDTO.statsToResponse(stats);

      expect(result).toEqual({
        ordersToday: 10,
        revenueToday: 500000,
        pendingOrders: 5,
        totalCustomers: 25,
      });
    });

    it('should handle zero values', () => {
      const stats: DashboardStats = {
        ordersToday: 0,
        revenueToday: 0,
        pendingOrders: 0,
        totalCustomers: 0,
      };

      const result = DashboardDTO.statsToResponse(stats);

      expect(result).toEqual({
        ordersToday: 0,
        revenueToday: 0,
        pendingOrders: 0,
        totalCustomers: 0,
      });
    });

    it('should handle large numbers', () => {
      const stats: DashboardStats = {
        ordersToday: 1000,
        revenueToday: 50000000,
        pendingOrders: 500,
        totalCustomers: 10000,
      };

      const result = DashboardDTO.statsToResponse(stats);

      expect(result.ordersToday).toBe(1000);
      expect(result.revenueToday).toBe(50000000);
      expect(result.pendingOrders).toBe(500);
      expect(result.totalCustomers).toBe(10000);
    });
  });

  describe('recentOrderToResponse', () => {
    const mockRecentOrder: RecentOrder = {
      id: 'order-123',
      trackingCode: 'ABC12345',
      customerName: 'John Doe',
      status: OrderStatus.WASHING,
      paymentStatus: PaymentStatus.PENDING,
      totalAmount: 50000,
      createdAt: new Date('2026-01-24T10:00:00Z'),
    };

    it('should transform recent order to response format', () => {
      const result = DashboardDTO.recentOrderToResponse(mockRecentOrder);

      expect(result).toHaveProperty('id', 'order-123');
      expect(result).toHaveProperty('trackingCode', 'ABC12345');
      expect(result).toHaveProperty('customerName', 'John Doe');
      expect(result).toHaveProperty('status', OrderStatus.WASHING);
      expect(result).toHaveProperty('paymentStatus', PaymentStatus.PENDING);
      expect(result).toHaveProperty('totalAmount', 50000);
      expect(result.createdAt).toBe('2026-01-24T10:00:00.000Z');
    });

    it('should use default customer name when null', () => {
      const orderWithoutName = { ...mockRecentOrder, customerName: null };
      const result = DashboardDTO.recentOrderToResponse(orderWithoutName);

      expect(result.customerName).toBe('Pelanggan');
    });

    it('should use default customer name when undefined', () => {
      const orderWithoutName = { ...mockRecentOrder, customerName: undefined };
      const result = DashboardDTO.recentOrderToResponse(orderWithoutName);

      expect(result.customerName).toBe('Pelanggan');
    });

    it('should convert date to ISO string', () => {
      const result = DashboardDTO.recentOrderToResponse(mockRecentOrder);

      expect(typeof result.createdAt).toBe('string');
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });

    it('should not include sensitive fields', () => {
      const orderWithExtraFields = {
        ...mockRecentOrder,
        outletId: 'outlet-123',
        customerPhone: '6281234567890',
        notes: 'Handle with care',
      } as any;
      const result = DashboardDTO.recentOrderToResponse(orderWithExtraFields);

      expect(result).not.toHaveProperty('outletId');
      expect(result).not.toHaveProperty('customerPhone');
      expect(result).not.toHaveProperty('notes');
    });
  });

  describe('recentOrdersToResponse', () => {
    it('should transform array of recent orders', () => {
      const orders: RecentOrder[] = [
        {
          id: 'order-1',
          trackingCode: 'ABC12345',
          customerName: 'John Doe',
          status: OrderStatus.WASHING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 50000,
          createdAt: new Date('2026-01-24T10:00:00Z'),
        },
        {
          id: 'order-2',
          trackingCode: 'XYZ67890',
          customerName: 'Jane Smith',
          status: OrderStatus.READY,
          paymentStatus: PaymentStatus.SETTLEMENT,
          totalAmount: 75000,
          createdAt: new Date('2026-01-24T11:00:00Z'),
        },
      ];

      const result = DashboardDTO.recentOrdersToResponse(orders);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
      expect(result[0].trackingCode).toBe('ABC12345');
      expect(result[1].trackingCode).toBe('XYZ67890');
    });

    it('should handle empty array', () => {
      const result = DashboardDTO.recentOrdersToResponse([]);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should apply default customer name to all orders without name', () => {
      const orders: RecentOrder[] = [
        {
          id: 'order-1',
          trackingCode: 'ABC12345',
          customerName: null,
          status: OrderStatus.WASHING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 50000,
          createdAt: new Date('2026-01-24T10:00:00Z'),
        },
        {
          id: 'order-2',
          trackingCode: 'XYZ67890',
          customerName: undefined,
          status: OrderStatus.READY,
          paymentStatus: PaymentStatus.SETTLEMENT,
          totalAmount: 75000,
          createdAt: new Date('2026-01-24T11:00:00Z'),
        },
      ];

      const result = DashboardDTO.recentOrdersToResponse(orders);

      expect(result[0].customerName).toBe('Pelanggan');
      expect(result[1].customerName).toBe('Pelanggan');
    });
  });
});
