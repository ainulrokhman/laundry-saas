/**
 * Order Status History DTO
 *
 * DTO untuk riwayat perubahan status order.
 */

import { Prisma } from '@/generated/prisma';

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

export class OrderStatusHistoryDTO {
  static toResponse(row: OrderStatusHistoryWithUser) {
    return {
      id: row.id,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      createdAt: row.createdAt.toISOString(),
      changedByUser: row.changedByUser
        ? {
            id: row.changedByUser.id,
            name: row.changedByUser.name,
            phone: this.maskPhone(row.changedByUser.phone),
          }
        : null,
    };
  }

  static toResponseArray(rows: OrderStatusHistoryWithUser[]) {
    return rows.map((r) => this.toResponse(r));
  }

  private static maskPhone(phone: string): string {
    if (!phone) return '****';
    if (phone.length <= 4) return '****';
    const start = phone.slice(0, 4);
    const end = phone.slice(-4);
    return `${start}****${end}`;
  }
}

