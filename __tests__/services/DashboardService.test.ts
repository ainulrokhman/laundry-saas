/**
 * Dashboard Service Tests
 * 
 * Tests for DashboardService business logic
 */

import { DashboardService } from '@/services/DashboardService';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createOrderData, createUserData } from '../utils/factories';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@/generated/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('DashboardService', () => {
  const prisma = createTestPrismaClient();
  const service = new DashboardService();

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('getDashboardStats', () => {
    it('should return correct dashboard statistics', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      const owner = await prisma.user.create({
        data: {
          ...createUserData({ role: 'OWNER' }),
          outletId: outlet.id,
        },
      });

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      // Use a date that's definitely yesterday
      const yesterdayDate = subDays(todayStart, 1);
      const yesterdayStart = startOfDay(yesterdayDate);
      const yesterdayEnd = endOfDay(yesterdayDate);

      // Create orders today (with SETTLEMENT status for revenue calculation)
      // These orders have default status QUEUED, but we'll mark them as TAKEN so they don't count as pending
      // Don't set customerPhone so they don't count in totalCustomers
      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
            totalAmount: 50000,
            paymentStatus: PaymentStatus.SETTLEMENT,
            status: OrderStatus.TAKEN, // Completed order, not pending
          }),
          createdAt: todayStart,
          customerPhone: null, // Don't count in totalCustomers
        },
      });

      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
            totalAmount: 75000,
            paymentStatus: PaymentStatus.SETTLEMENT,
            status: OrderStatus.TAKEN, // Completed order, not pending
          }),
          createdAt: todayEnd,
          customerPhone: null, // Don't count in totalCustomers
        },
      });

      // Create pending order (not today - should not count in ordersToday, but counts as pending)
      // Don't set customerPhone so it doesn't count in totalCustomers
      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
            status: OrderStatus.WASHING,
          }),
          createdAt: yesterdayStart, // Use yesterdayStart to ensure it's definitely yesterday
          customerPhone: null, // Don't count in totalCustomers
        },
      });

      // Create orders with different customer phones (not today - for customer count only)
      // Mark as TAKEN so they don't count as pending
      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
            customerPhone: '6281111111111',
            status: OrderStatus.TAKEN, // Completed, not pending
          }),
          createdAt: yesterdayStart, // Use yesterdayStart to ensure it's definitely yesterday
        },
      });

      await prisma.order.create({
        data: {
          ...createOrderData({
            outletId: outlet.id,
            customerPhone: '6282222222222',
            status: OrderStatus.TAKEN, // Completed, not pending
          }),
          createdAt: yesterdayStart, // Use yesterdayStart to ensure it's definitely yesterday
        },
      });

      const sessionUser = {
        id: owner.id,
        phone: owner.phone,
        name: owner.name,
        role: owner.role,
        outletId: outlet.id,
      };

      const stats = await service.getDashboardStats(sessionUser);

      expect(stats.ordersToday).toBe(2);
      expect(stats.revenueToday).toBe(125000);
      expect(stats.pendingOrders).toBe(1);
      expect(stats.totalCustomers).toBe(2);
    });

    it('should throw error if user is not authenticated', async () => {
      await expect(service.getDashboardStats(null)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('should throw error if outletId is missing', async () => {
      const user = {
        id: 'user-id',
        phone: '6281111111111',
        name: 'Test User',
        role: 'OWNER' as const,
        outletId: null,
      };

      await expect(service.getDashboardStats(user as any)).rejects.toThrow();
    });
  });

  describe('getRecentOrders', () => {
    it('should return recent orders in correct order', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      const owner = await prisma.user.create({
        data: {
          ...createUserData({ role: 'OWNER' }),
          outletId: outlet.id,
        },
      });

      const order1 = await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          customerName: 'Customer 1',
          createdAt: new Date('2024-01-01'),
        }),
      });

      const order2 = await prisma.order.create({
        data: createOrderData({
          outletId: outlet.id,
          customerName: 'Customer 2',
          createdAt: new Date('2024-01-02'),
        }),
      });

      const sessionUser = {
        id: owner.id,
        phone: owner.phone,
        name: owner.name,
        role: owner.role,
        outletId: outlet.id,
      };

      const orders = await service.getRecentOrders(sessionUser, 2);

      expect(orders).toHaveLength(2);
      // Should be ordered by createdAt desc (newest first)
      expect(orders[0].id).toBe(order2.id);
      expect(orders[0].customerName).toBe('Customer 2');
      expect(orders[1].id).toBe(order1.id);
      expect(orders[1].customerName).toBe('Customer 1');
    });

    it('should respect limit parameter', async () => {
      const outlet = await prisma.outlet.create({
        data: createOutletData({ slug: 'test-outlet' }),
      });

      const owner = await prisma.user.create({
        data: {
          ...createUserData({ role: 'OWNER' }),
          outletId: outlet.id,
        },
      });

      // Create 5 orders
      for (let i = 0; i < 5; i++) {
        await prisma.order.create({
          data: createOrderData({
            outletId: outlet.id,
          }),
        });
      }

      const sessionUser = {
        id: owner.id,
        phone: owner.phone,
        name: owner.name,
        role: owner.role,
        outletId: outlet.id,
      };

      const orders = await service.getRecentOrders(sessionUser, 3);

      expect(orders).toHaveLength(3);
    });
  });
});
