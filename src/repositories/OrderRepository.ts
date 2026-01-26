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
}
