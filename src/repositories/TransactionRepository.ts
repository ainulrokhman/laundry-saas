/**
 * Transaction Repository
 * 
 * Data access layer for Transaction model.
 * All queries include outletId filter for multi-tenancy isolation.
 */

import { prisma } from '@/lib/prisma';
import { Transaction, PaymentStatus, TransType, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

export class TransactionRepository extends BaseRepository {
  /**
   * Find transaction by ID (with outletId filter)
   */
  async findById(outletId: string, id: string): Promise<Transaction | null> {
    this.ensureOutletId(outletId, 'Transaction');
    return prisma.transaction.findFirst({
      where: this.combineFilters(outletId, { id }),
    });
  }

  /**
   * Find all transactions for an outlet
   */
  async findByOutletId(
    outletId: string,
    options?: {
      type?: TransType;
      status?: PaymentStatus;
      limit?: number;
      orderBy?: Prisma.TransactionOrderByWithRelationInput;
    }
  ): Promise<Transaction[]> {
    this.ensureOutletId(outletId, 'Transaction');
    const where: Prisma.TransactionWhereInput = this.getOutletFilter(outletId);

    if (options?.type) {
      where.type = options.type;
    }
    if (options?.status) {
      where.status = options.status;
    }

    return prisma.transaction.findMany({
      where,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      take: options?.limit,
    });
  }

  /**
   * Get total revenue from transactions
   */
  async getTotalRevenue(
    outletId: string,
    filters?: {
      type?: TransType;
      status?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<number> {
    this.ensureOutletId(outletId, 'Transaction');
    const where: Prisma.TransactionWhereInput = this.getOutletFilter(outletId);

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
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

    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * Count transactions for an outlet
   */
  async countByOutletId(
    outletId: string,
    filters?: {
      type?: TransType;
      status?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<number> {
    this.ensureOutletId(outletId, 'Transaction');
    const where: Prisma.TransactionWhereInput = this.getOutletFilter(outletId);

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
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

    return prisma.transaction.count({ where });
  }

  /**
   * Generic find method with full Prisma options support
   */
  async find(
    outletId: string,
    options?: {
      where?: Prisma.TransactionWhereInput;
      skip?: number;
      take?: number;
      orderBy?: Prisma.TransactionOrderByWithRelationInput;
      include?: Prisma.TransactionInclude;
    }
  ): Promise<Transaction[]> {
    this.ensureOutletId(outletId, 'Transaction');

    const where = {
      ...this.getOutletFilter(outletId),
      ...options?.where,
    };

    return prisma.transaction.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
      include: options?.include,
    });
  }

  /**
   * Generic count method with where clause support
   */
  async count(
    outletId: string,
    where?: Prisma.TransactionWhereInput
  ): Promise<number> {
    this.ensureOutletId(outletId, 'Transaction');

    const combinedWhere = {
      ...this.getOutletFilter(outletId),
      ...where,
    };

    return prisma.transaction.count({ where: combinedWhere });
  }


  /**
   * Find subscription payments (Admin - cross outlet, no outletId filter)
   * For SUPERADMIN payment verification
   */
  async findSubscriptionPayments(options?: {
    status?: PaymentStatus;
    page?: number;
    limit?: number;
    search?: string; // search by outlet name
  }): Promise<{ data: Transaction[]; total: number }> {
    const where: Prisma.TransactionWhereInput = {
      type: TransType.SUBSCRIPTION,
    };

    if (options?.status) {
      where.status = options.status;
    }

    // Search by outlet name (if provided)
    if (options?.search) {
      where.outletId = {
        not: null,
      };
      // Note: This requires a join, we'll handle it in the service layer
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              trackingCode: true,
              customerName: true,
            },
          },
          bankAccount: {
            select: {
              id: true,
              bankName: true,
              accountNumber: true,
              accountName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find subscription payment by ID (Admin - no outletId filter)
   * Includes outlet details for display
   */
  async findSubscriptionPaymentById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: {
        id,
        type: TransType.SUBSCRIPTION,
      },
      include: {
        order: {
          select: {
            id: true,
            trackingCode: true,
            customerName: true,
            outlet: {
              select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            description: true,
            maxOutlets: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            subscriptionExpiresAt: true,
          }
        }
      },
    });
  }

  /**
   * Update transaction payment status (Admin)
   * Used for approve/reject workflows
   */
  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    settledAt?: Date
  ): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: {
        status,
        ...(settledAt && { settledAt }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get subscription payment statistics (Admin)
   * Returns counts by status
   */
  async getSubscriptionPaymentStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.transaction.count({
        where: { type: TransType.SUBSCRIPTION, status: PaymentStatus.PENDING },
      }),
      prisma.transaction.count({
        where: { type: TransType.SUBSCRIPTION, status: PaymentStatus.SETTLEMENT },
      }),
      prisma.transaction.count({
        where: { type: TransType.SUBSCRIPTION, status: PaymentStatus.FAILURE },
      }),
      prisma.transaction.count({
        where: { type: TransType.SUBSCRIPTION },
      }),
    ]);

    return { pending, approved, rejected, total };
  }

  // ============================================
  // Global Methods (Multi-Outlet)
  // ============================================

  /**
   * Find transactions for multiple outlets (Global Mode)
   */
  async findByOutletIds(
    outletIds: string[],
    options?: {
      where?: Prisma.TransactionWhereInput;
      skip?: number;
      take?: number;
      orderBy?: Prisma.TransactionOrderByWithRelationInput;
      include?: Prisma.TransactionInclude;
    }
  ): Promise<Transaction[]> {
    if (outletIds.length === 0) {
      return [];
    }

    const where: Prisma.TransactionWhereInput = {
      outletId: { in: outletIds },
      ...options?.where,
    };

    return prisma.transaction.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      include: {
        ...options?.include,
        outlet: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Count transactions for multiple outlets (Global Mode)
   */
  async countByOutletIds(
    outletIds: string[],
    where?: Prisma.TransactionWhereInput
  ): Promise<number> {
    if (outletIds.length === 0) {
      return 0;
    }

    const combinedWhere: Prisma.TransactionWhereInput = {
      outletId: { in: outletIds },
      ...where,
    };

    return prisma.transaction.count({ where: combinedWhere });
  }

  /**
   * Get total revenue from transactions for multiple outlets (Global Mode)
   */
  async getTotalRevenueByOutletIds(
    outletIds: string[],
    filters?: {
      type?: TransType;
      status?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<number> {
    if (outletIds.length === 0) {
      return 0;
    }

    const where: Prisma.TransactionWhereInput = {
      outletId: { in: outletIds },
    };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
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

    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * Count transactions for multiple outlets with filters (Global Mode)
   */
  async countByOutletIdsWithFilters(
    outletIds: string[],
    filters?: {
      type?: TransType;
      status?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<number> {
    if (outletIds.length === 0) {
      return 0;
    }

    const where: Prisma.TransactionWhereInput = {
      outletId: { in: outletIds },
    };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
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

    return prisma.transaction.count({ where });
  }
}
