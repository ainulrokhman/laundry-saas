/**
 * Dashboard Service
 * 
 * Business logic for dashboard statistics and data.
 */

import { BaseService } from './BaseService';
import { OrderRepository } from '@/repositories/OrderRepository';
import { TransactionRepository } from '@/repositories/TransactionRepository';
import { SessionUser } from '@/lib/session';
import { startOfDay, endOfDay } from 'date-fns';

export interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  totalCustomers: number;
}

export interface RecentOrder {
  id: string;
  trackingCode: string;
  customerName: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: Date;
}

export class DashboardService extends BaseService {
  private orderRepository: OrderRepository;
  private transactionRepository: TransactionRepository;

  constructor() {
    super();
    this.orderRepository = new OrderRepository();
    this.transactionRepository = new TransactionRepository();
  }

  /**
   * Get dashboard statistics for an outlet
   */
  async getDashboardStats(user: SessionUser | null): Promise<DashboardStats> {
    const outletId = this.getOutletId(user);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Orders today
    const ordersToday = await this.orderRepository.countByOutletId(outletId, {
      dateFrom: todayStart,
      dateTo: todayEnd,
    });

    // Revenue today (from orders with SETTLEMENT payment status)
    const revenueToday = await this.orderRepository.getTotalRevenue(outletId, {
      dateFrom: todayStart,
      dateTo: todayEnd,
      paymentStatus: 'SETTLEMENT',
    });

    // Pending orders (not TAKEN)
    const pendingOrders = await this.orderRepository.countPendingOrders(outletId);

    // Total customers (unique customerPhone in orders)
    // Note: This is a simplified count. In production, you might want a Customer model.
    const totalCustomers = await this.getTotalCustomers(outletId);

    return {
      ordersToday,
      revenueToday,
      pendingOrders,
      totalCustomers,
    };
  }

  /**
   * Get recent orders for dashboard
   */
  async getRecentOrders(
    user: SessionUser | null,
    limit: number = 10
  ): Promise<RecentOrder[]> {
    const outletId = this.getOutletId(user);
    const orders = await this.orderRepository.findRecentOrders(outletId, limit);

    return orders.map((order) => ({
      id: order.id,
      trackingCode: order.trackingCode,
      customerName: order.customerName,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    }));
  }

  /**
   * Get total unique customers for an outlet
   * This is a simplified implementation - counts unique customerPhone
   */
  private async getTotalCustomers(outletId: string): Promise<number> {
    const { prisma } = await import('@/lib/prisma');
    
    // Count distinct customerPhone values (excluding null)
    const result = await prisma.order.groupBy({
      by: ['customerPhone'],
      where: {
        outletId,
        customerPhone: {
          not: null,
        },
      },
    });

    return result.length;
  }
}
