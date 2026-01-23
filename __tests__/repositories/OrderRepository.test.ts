/**
 * Order Repository Tests
 * 
 * Tests for OrderRepository with outlet filtering and dashboard stats methods
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { OrderRepository } from '@/repositories/OrderRepository';
import { createTestPrismaClient, cleanupTestDatabase } from '../utils/test-db';
import { createOutletData, createOrderData } from '../utils/factories';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@/generated/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

describe('OrderRepository', () => {
  const prisma = createTestPrismaClient();
  const repo = new OrderRepository();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('outlet filtering', () => {
    it('should only return orders for specified outlet', async () => {
      const outlet1 = await prisma.outlet.create({
        data: createOutletData({ slug: 'outlet-1' }),
      });

      const outlet2 = await prisma.outlet.create({
        data: createOutletData({ slug: 'outlet-2' }),
      });

      const order1 = await prisma.order.create({
        data: createOrderData({ outletId: outlet1.id }),
      });

      await prisma.order.create({
        data: createOrderData({ outletId: outlet2.id }),
      });

      const orders = await repo.findByOutletId(outlet1.id);

      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(order1.id);
      expect(orders[0].outletId).toBe(outlet1.id);
    });

    it('should only find order by ID if outletId matches', async () => {
      const outlet1 = await prisma.outlet.create({
        data: createOutletData({ slug: 'outlet-1' }),
      });

      const outlet2 = await prisma.outlet.create({
        data: createOutletData({ slug: 'outlet-2' }),
      });

      const order1 = await prisma.order.create({
        data: createOrderData({ outletId: outlet1.id }),
      });

      const found = await repo.findById(outlet1.id, order1.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(order1.id);

      const notFound = await repo.findById(outlet2.id, order1.id);
      expect(notFound).toBeNull();
    });
  });

  describe('dashboard stats methods', () => {
    it('should count orders today correctly', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      // Use a date that's definitely yesterday
      const yesterdayDate = subDays(todayStart, 1);
      const yesterdayStart = startOfDay(yesterdayDate);
      const yesterdayEnd = endOfDay(yesterdayDate);

      // Create orders today (within today's range)
      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
          }),
          createdAt: todayStart,
        },
      });

      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
          }),
          createdAt: todayEnd,
        },
      });

      // Create order yesterday (should not be counted)
      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
          }),
          createdAt: yesterdayStart, // Use yesterdayStart to ensure it's definitely yesterday
        },
      });

      const count = await repo.countByOutletId(outlet.id, {
        dateFrom: todayStart,
        dateTo: todayEnd,
      });

      expect(count).toBe(2);
    });

    it('should calculate total revenue correctly', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      // Create orders with SETTLEMENT status
      await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          totalAmount: 50000,
          paymentStatus: PaymentStatus.SETTLEMENT,
        }),
      });

      await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          totalAmount: 75000,
          paymentStatus: PaymentStatus.SETTLEMENT,
        }),
      });

      // Create order with UNPAID status (should not be counted)
      await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          totalAmount: 100000,
          paymentStatus: PaymentStatus.UNPAID,
        }),
      });

      const revenue = await repo.getTotalRevenue(outlet.id, {
        paymentStatus: PaymentStatus.SETTLEMENT,
      });

      expect(revenue).toBe(125000);
    });

    it('should count pending orders correctly', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      // Create pending orders (not TAKEN)
      await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          status: OrderStatus.QUEUED,
        }),
      });

      await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          status: OrderStatus.WASHING,
        }),
      });

      // Create completed order (TAKEN)
      await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          status: OrderStatus.TAKEN,
        }),
      });

      const pendingCount = await repo.countPendingOrders(outlet.id);

      expect(pendingCount).toBe(2);
    });

    it('should get recent orders in correct order', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      const order1 = await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          createdAt: new Date('2024-01-01'),
        }),
      });

      const order2 = await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          createdAt: new Date('2024-01-02'),
        }),
      });

      const order3 = await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          createdAt: new Date('2024-01-03'),
        }),
      });

      const recentOrders = await repo.findRecentOrders(outlet.id, 2);

      expect(recentOrders).toHaveLength(2);
      // Should be ordered by createdAt desc (newest first)
      expect(recentOrders[0].id).toBe(order3.id);
      expect(recentOrders[1].id).toBe(order2.id);
    });
  });
});
