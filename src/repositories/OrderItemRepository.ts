/**
 * OrderItem Repository
 *
 * Data access layer untuk OrderItem model.
 * Catatan multi-tenancy:
 * - OrderItem tidak punya outletId, jadi semua query harus difilter via relasi `order.outletId`.
 */

import { prisma } from '@/lib/prisma';
import { OrderItem, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

export class OrderItemRepository extends BaseRepository {
  async findByOrderId(outletId: string, orderId: string): Promise<OrderItem[]> {
    this.ensureOutletId(outletId, 'OrderItem');
    return prisma.orderItem.findMany({
      where: {
        orderId,
        order: { outletId },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteByOrderId(outletId: string, orderId: string): Promise<number> {
    this.ensureOutletId(outletId, 'OrderItem');
    // Pastikan order milik outlet sebelum delete
    const orderExists = await prisma.order.count({
      where: { id: orderId, outletId },
    });
    if (orderExists === 0) {
      throw new Error('Order not found or access denied');
    }

    const result = await prisma.orderItem.deleteMany({
      where: { orderId },
    });
    return result.count;
  }

  async createManyForOrder(
    outletId: string,
    orderId: string,
    items: Array<Omit<Prisma.OrderItemCreateManyInput, 'orderId'>>
  ): Promise<number> {
    this.ensureOutletId(outletId, 'OrderItem');
    const orderExists = await prisma.order.count({
      where: { id: orderId, outletId },
    });
    if (orderExists === 0) {
      throw new Error('Order not found or access denied');
    }

    const result = await prisma.orderItem.createMany({
      data: items.map((i) => ({ ...i, orderId })),
    });
    return result.count;
  }
}

