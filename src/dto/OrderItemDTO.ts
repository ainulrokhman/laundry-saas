/**
 * OrderItem DTO
 *
 * DTO untuk item layanan pada order (snapshot).
 */

import { OrderItem } from '@/generated/prisma';

export class OrderItemDTO {
  static toResponse(item: OrderItem) {
    return {
      id: item.id,
      orderId: item.orderId,
      serviceId: item.serviceId ?? null,
      serviceName: item.serviceName,
      serviceType: item.serviceType,
      serviceUnit: item.serviceUnit ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  static toResponseArray(items: OrderItem[]) {
    return items.map((i) => this.toResponse(i));
  }
}

