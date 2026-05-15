/**
 * Order Repository
 * 
 * Data access layer for Order model.
 * All queries include outletId filter for multi-tenancy isolation.
 */

import { prisma } from '@/lib/prisma';
import { Order, OrderStatus, PaymentStatus, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
  };
}>;

type OrderWithItemsAndHistory = Prisma.OrderGetPayload<{
  include: {
    items: true;
    statusHistory: {
      include: {
        changedByUser: {
          select: {
            id: true;
            name: true;
            phone: true;
          };
        };
      };
    };
  };
}>;

type OrderForInvoice = Prisma.OrderGetPayload<{
  include: {
    items: true;
    outlet: {
      select: {
        id: true;
        name: true;
        slug: true;
        address: true;
        contactPhone: true;
      };
    };
  };
}>;

export class OrderRepository extends BaseRepository {
  /**
   * Find order by ID (with outletId filter)
   */
  async findById(outletId: string, id: string): Promise<Order | null> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findFirst({
      where: this.combineFilters(outletId, { id }),
    });
  }

  /**
   * Find order by ID including items (with outletId filter)
   */
  async findByIdWithItems(outletId: string, id: string): Promise<OrderWithItemsAndHistory | null> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findFirst({
      where: this.combineFilters(outletId, { id }),
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find order by ID for invoice/receipt (include items + outlet info)
   */
  async findByIdForInvoice(outletId: string, id: string): Promise<OrderForInvoice | null> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findFirst({
      where: this.combineFilters(outletId, { id }),
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            contactPhone: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          include: {
            changedByUser: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  /**
   * Find order by tracking code (with outletId filter)
   */
  async findByTrackingCode(
    outletId: string,
    trackingCode: string
  ): Promise<Order | null> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findFirst({
      where: this.combineFilters(outletId, { trackingCode }),
    });
  }

  /**
   * Find order by tracking code for public tracking (minimal relation: outlet name)
   */
  async findByTrackingCodeForPublic(
    outletId: string,
    trackingCode: string
  ) {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findFirst({
      where: this.combineFilters(outletId, { trackingCode }),
      include: {
        outlet: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Find paged orders for an outlet (search + filters)
   */
  async findPagedByOutletId(
    outletId: string,
    options: {
      q?: string;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    } = {}
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    this.ensureOutletId(outletId, 'Order');
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = this.getOutletFilter(outletId);

    if (options.status) where.status = options.status;
    if (options.paymentStatus) where.paymentStatus = options.paymentStatus;

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    if (options.q && options.q.trim().length > 0) {
      const q = options.q.trim();
      where.OR = [
        { trackingCode: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: options.orderBy || { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data: orders, total, page, limit };
  }

  /**
   * Find all orders for an outlet
   */
  async findByOutletId(
    outletId: string,
    options?: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      limit?: number;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    }
  ): Promise<Order[]> {
    this.ensureOutletId(outletId, 'Order');
    const where: Prisma.OrderWhereInput = this.getOutletFilter(outletId);

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.paymentStatus) {
      where.paymentStatus = options.paymentStatus;
    }

    return prisma.order.findMany({
      where,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      take: options?.limit,
    });
  }

  /**
   * Count orders for an outlet
   */
  async countByOutletId(
    outletId: string,
    filters?: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<number> {
    this.ensureOutletId(outletId, 'Order');
    const where: Prisma.OrderWhereInput = this.getOutletFilter(outletId);

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    return prisma.order.count({ where });
  }

  /**
   * Get total revenue for an outlet
   */
  async getTotalRevenue(
    outletId: string,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      paymentStatus?: PaymentStatus;
    }
  ): Promise<number> {
    this.ensureOutletId(outletId, 'Order');
    const where: Prisma.OrderWhereInput = this.getOutletFilter(outletId);

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const result = await prisma.order.aggregate({
      where,
      _sum: {
        totalAmount: true,
      },
    });

    return result._sum.totalAmount || 0;
  }

  /**
   * Get pending orders (not TAKEN)
   */
  async findPendingOrders(outletId: string): Promise<Order[]> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findMany({
      where: this.combineFilters(outletId, {
        status: {
          not: OrderStatus.TAKEN,
        },
      }),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count pending orders
   */
  async countPendingOrders(outletId: string): Promise<number> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.count({
      where: this.combineFilters(outletId, {
        status: {
          not: OrderStatus.TAKEN,
        },
      }),
    });
  }

  /**
   * Get recent orders
   */
  async findRecentOrders(
    outletId: string,
    limit: number = 10
  ): Promise<Order[]> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.findMany({
      where: this.getOutletFilter(outletId),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Create new order
   */
  async create(
    outletId: string,
    data: Omit<Prisma.OrderCreateInput, 'outlet'>
  ): Promise<Order> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.create({
      data: {
        ...data,
        outlet: {
          connect: { id: outletId },
        },
      },
    });
  }

  /**
   * Create new order with items in a single transaction
   */
  async createWithItems(
    outletId: string,
    data: Omit<Prisma.OrderCreateInput, 'outlet' | 'items'>,
    items: Prisma.OrderItemCreateWithoutOrderInput[]
  ): Promise<OrderWithItems> {
    this.ensureOutletId(outletId, 'Order');
    return prisma.order.create({
      data: {
        ...data,
        outlet: {
          connect: { id: outletId },
        },
        items: {
          create: items,
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Update order
   */
  async update(
    outletId: string,
    id: string,
    data: Prisma.OrderUpdateInput
  ): Promise<Order> {
    this.ensureOutletId(outletId, 'Order');
    // Verify outletId matches before update
    const order = await this.findById(outletId, id);
    if (!order) {
      throw new Error('Order not found or access denied');
    }
    return prisma.order.update({
      where: { id },
      data,
    });
  }
  /**
   * Get stats by date range
   */
  async getStatsByDateRange(
    outletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ totalOrders: number; totalRevenue: number; totalCustomers: number }> {
    this.ensureOutletId(outletId, 'Order');

    const where: Prisma.OrderWhereInput = this.combineFilters(outletId, {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      // status: {
      //   not: OrderStatus.CANCELLED,
      // },
    });

    const [countResult, revenueResult, customersResult] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: {
          ...where,
          paymentStatus: PaymentStatus.SETTLEMENT, // Only count settled payments for revenue
        },
        _sum: {
          totalAmount: true,
        },
      }),
      // distinct customers
      prisma.order.groupBy({
        by: ['customerPhone'],
        where: {
          ...where,
          customerPhone: { not: null }
        },
      })
    ]);

    return {
      totalOrders: countResult,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      totalCustomers: customersResult.length,
    };
  }

  /**
   * Get daily stats for a date range
   * Returns orders and revenue grouped by day
   */
  async getDailyStats(
    outletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number; revenue: number }>> {
    this.ensureOutletId(outletId, 'Order');

    // Fetch relevant fields to aggregate in memory
    const orders = await prisma.order.findMany({
      where: this.combineFilters(outletId, {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },

      }),
      select: {
        createdAt: true,
        totalAmount: true,
        paymentStatus: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Aggregate in memory
    const statsMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

      const current = statsMap.get(dateKey) || { count: 0, revenue: 0 };

      current.count += 1;
      if (order.paymentStatus === PaymentStatus.SETTLEMENT) {
        current.revenue += order.totalAmount;
      }

      statsMap.set(dateKey, current);
    });

    // Convert map to array
    return Array.from(statsMap.entries()).map(([date, stats]) => ({
      date,
      count: stats.count,
      revenue: stats.revenue,
    }));
  }


  async getPaymentMethodStats(
    outletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ method: string; count: number; amount: number }>> {
    this.ensureOutletId(outletId, 'Order');

    const where = this.combineFilters(outletId, {
      createdAt: { gte: startDate, lte: endDate },

      paymentStatus: PaymentStatus.SETTLEMENT,
    });

    const result = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    return result.map(r => ({
      method: r.paymentMethod || 'UNKNOWN',
      count: r._count._all,
      amount: r._sum.totalAmount || 0,
    }));
  }

  async getUnpaidOrders(outletId: string): Promise<any[]> {
    this.ensureOutletId(outletId, 'Order');

    return prisma.order.findMany({
      where: this.combineFilters(outletId, {

        OR: [
          { paymentStatus: PaymentStatus.UNPAID },
          { paymentStatus: PaymentStatus.PENDING },
          // For DP, logic might be complex if we don't have separate flag. 
          // Assuming simple UNPAID/PENDING check for now.
        ]
      }),
      select: {
        id: true,
        trackingCode: true,
        customerName: true,
        totalAmount: true,
        dpAmount: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // Global Reports Methods (Multi-Outlet)
  // ============================================

  /**
   * Get stats by date range for multiple outlets (Global Reports)
   */
  async getGlobalStatsByDateRange(
    outletIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{ totalOrders: number; totalRevenue: number; totalCustomers: number }> {
    if (outletIds.length === 0) {
      return { totalOrders: 0, totalRevenue: 0, totalCustomers: 0 };
    }

    const where: Prisma.OrderWhereInput = {
      outletId: { in: outletIds },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [countResult, revenueResult, customersResult] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: {
          ...where,
          paymentStatus: PaymentStatus.SETTLEMENT,
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.order.groupBy({
        by: ['customerPhone'],
        where: {
          ...where,
          customerPhone: { not: null }
        },
      })
    ]);

    return {
      totalOrders: countResult,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      totalCustomers: customersResult.length,
    };
  }

  /**
   * Get daily stats for multiple outlets (Global Reports)
   */
  async getGlobalDailyStats(
    outletIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number; revenue: number }>> {
    if (outletIds.length === 0) {
      return [];
    }

    const orders = await prisma.order.findMany({
      where: {
        outletId: { in: outletIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        paymentStatus: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const statsMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const current = statsMap.get(dateKey) || { count: 0, revenue: 0 };

      current.count += 1;
      if (order.paymentStatus === PaymentStatus.SETTLEMENT) {
        current.revenue += order.totalAmount;
      }

      statsMap.set(dateKey, current);
    });

    return Array.from(statsMap.entries()).map(([date, stats]) => ({
      date,
      count: stats.count,
      revenue: stats.revenue,
    }));
  }

  /**
   * Get payment method stats for multiple outlets (Global Reports)
   */
  async getGlobalPaymentMethodStats(
    outletIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ method: string; count: number; amount: number }>> {
    if (outletIds.length === 0) {
      return [];
    }

    const result = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        outletId: { in: outletIds },
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: PaymentStatus.SETTLEMENT,
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    return result.map(r => ({
      method: r.paymentMethod || 'UNKNOWN',
      count: r._count._all,
      amount: r._sum.totalAmount || 0,
    }));
  }

  /**
   * Get unpaid orders for multiple outlets (Global Reports)
   */
  async getGlobalUnpaidOrders(outletIds: string[]): Promise<any[]> {
    if (outletIds.length === 0) {
      return [];
    }

    return prisma.order.findMany({
      where: {
        outletId: { in: outletIds },
        OR: [
          { paymentStatus: PaymentStatus.UNPAID },
          { paymentStatus: PaymentStatus.PENDING },
        ]
      },
      select: {
        id: true,
        trackingCode: true,
        customerName: true,
        totalAmount: true,
        dpAmount: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
        outletId: true,
        outlet: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get per-outlet breakdown for Global Reports
   */
  async getPerOutletBreakdown(
    outletIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    outletId: string;
    outletName: string;
    totalOrders: number;
    totalRevenue: number;
  }>> {
    if (outletIds.length === 0) {
      return [];
    }

    const result = await prisma.order.groupBy({
      by: ['outletId'],
      where: {
        outletId: { in: outletIds },
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: PaymentStatus.SETTLEMENT,
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    // Get outlet names
    const outlets = await prisma.outlet.findMany({
      where: { id: { in: outletIds } },
      select: { id: true, name: true },
    });
    const outletMap = new Map(outlets.map(o => [o.id, o.name]));

    return result.map(r => ({
      outletId: r.outletId,
      outletName: outletMap.get(r.outletId) || 'Unknown',
      totalOrders: r._count._all,
      totalRevenue: r._sum.totalAmount || 0,
    }));
  }

  /**
   * Find paged orders for multiple outlets (Global Mode)
   * Returns orders with outlet info
   */
  async findPagedByOutletIds(
    outletIds: string[],
    options: {
      q?: string;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
    } = {}
  ): Promise<{ data: (Order & { outlet: { id: string; name: string } })[]; total: number; page: number; limit: number }> {
    if (outletIds.length === 0) {
      return { data: [], total: 0, page: 1, limit: 20 };
    }

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      outletId: { in: outletIds },
    };

    if (options.status) where.status = options.status;
    if (options.paymentStatus) where.paymentStatus = options.paymentStatus;

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = options.dateFrom;
      if (options.dateTo) where.createdAt.lte = options.dateTo;
    }

    if (options.q && options.q.trim().length > 0) {
      const q = options.q.trim();
      where.OR = [
        { trackingCode: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          outlet: {
            select: { id: true, name: true },
          },
        },
        orderBy: options.orderBy || { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data: orders, total, page, limit };
  }
}
