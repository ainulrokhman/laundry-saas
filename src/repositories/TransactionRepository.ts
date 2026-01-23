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
}
