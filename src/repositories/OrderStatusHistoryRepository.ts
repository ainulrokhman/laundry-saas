/**
 * Order Status History Repository
 *
 * Data access layer untuk riwayat perubahan status order.
 * Tenant-safe: query selalu dibatasi lewat relasi Order.outletId.
 */

import { prisma } from '@/lib/prisma';
import { OrderStatus, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

export type OrderStatusHistoryWithUser = Prisma.OrderStatusHistoryGetPayload<{
  include: {
    changedByUser: {
      select: {
        id: true;
        name: true;
        phone: true;
      };
    };
  };
}>;

export class OrderStatusHistoryRepository extends BaseRepository {
  async create(
    outletId: string,
    input: {
      orderId: string;
      fromStatus: OrderStatus;
      toStatus: OrderStatus;
      changedByUserId: string | null;
    }
  ) {
    this.ensureOutletId(outletId, 'OrderStatusHistory');

    // Safety: service wajib memastikan order milik outletId yang benar sebelum memanggil ini.
    return prisma.orderStatusHistory.create({
      data: {
        order: { connect: { id: input.orderId } },
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        changedByUser: input.changedByUserId
          ? { connect: { id: input.changedByUserId } }
          : undefined,
      },
    });
  }

  async findByOrderId(outletId: string, orderId: string): Promise<OrderStatusHistoryWithUser[]> {
    this.ensureOutletId(outletId, 'OrderStatusHistory');

    return prisma.orderStatusHistory.findMany({
      where: {
        orderId,
        order: {
          outletId,
        },
      },
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
    });
  }
}

