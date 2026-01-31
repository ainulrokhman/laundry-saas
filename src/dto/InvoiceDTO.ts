/**
 * Invoice DTO
 *
 * DTO khusus untuk halaman invoice/struk internal (OWNER/STAFF).
 * Berbeda dari OrderDTO karena:
 * - membutuhkan info outlet (alamat/telepon)
 * - membutuhkan field DP (uang muka)
 * - customerPhone tidak perlu di-mask (untuk kebutuhan struk/WA)
 */

import { Prisma } from '@/generated/prisma';
import { OrderItemDTO } from './OrderItemDTO';

export type OrderInvoicePayload = Prisma.OrderGetPayload<{
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

function roundIdr(value: number): number {
  return Math.round(value);
}

export class InvoiceDTO {
  static toResponse(order: OrderInvoicePayload) {
    // Backward/forward compatible: field DP akan ada setelah schema + generate.
    const dpAmount = roundIdr(Number((order as any).dpAmount ?? 0));
    const dpPaidAt = ((order as any).dpPaidAt as Date | null | undefined) ?? null;
    const dpNote = ((order as any).dpNote as string | null | undefined) ?? null;
    const cashReceived = roundIdr(Number((order as any).cashReceived ?? 0));

    const remainingAmount = Math.max(0, roundIdr(order.totalAmount - dpAmount));

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      paymentNote: order.paymentNote || null,
      totalAmount: order.totalAmount,
      dpAmount,
      dpPaidAt: dpPaidAt ? dpPaidAt.toISOString() : null,
      dpNote,
      cashReceived,
      remainingAmount,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      notes: order.notes || null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      completedAt: order.completedAt ? order.completedAt.toISOString() : null,
      outlet: {
        id: order.outlet.id,
        name: order.outlet.name,
        slug: order.outlet.slug,
        address: order.outlet.address,
        contactPhone: order.outlet.contactPhone || null,
      },
      items: OrderItemDTO.toResponseArray(order.items),
    };
  }
}

