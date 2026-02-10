/**
 * Order DTO
 * 
 * Data Transfer Objects for order responses.
 * Ensures sensitive data is scrubbed before sending to client.
 */

import { Order, PaymentStatus, PaymentMethod, OrderItem } from '@/generated/prisma';
import { OrderItemDTO } from './OrderItemDTO';
import { OrderStatusHistoryDTO } from './OrderStatusHistoryDTO';

export interface OrderWithRelations extends Order {
  outlet?: {
    id: string;
    name: string;
    slug: string;
  };
  items?: OrderItem[];
  statusHistory?: any[];
  transactions?: Array<{
    id: string;
    amount: number;
    paymentMethod: PaymentMethod | null;
    status: PaymentStatus;
    createdAt: Date;
  }>;
}

export class OrderDTO {
  /**
   * Transform order to response format
   * Scrubs sensitive data and only includes necessary fields
   */
  static toResponse(order: OrderWithRelations) {
    const paidAt = (order as any).paidAt as Date | null | undefined;
    const paymentNote = (order as any).paymentNote as string | null | undefined;

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paidAt: paidAt ? paidAt.toISOString() : null,
      paymentNote: paymentNote || null,
      totalAmount: order.totalAmount,
      dpAmount: order.dpAmount || 0,
      dpPaidAt: (order as any).dpPaidAt ? new Date((order as any).dpPaidAt).toISOString() : null,
      cashReceived: order.cashReceived || 0,
      customerName: order.customerName || null,
      customerPhone: order.customerPhone ? this.maskPhone(order.customerPhone) : null, // Mask phone for privacy
      notes: order.notes || null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      completedAt: order.completedAt?.toISOString() || null,
      // Include outlet info if available (minimal)
      ...(order.outlet && {
        outlet: {
          id: order.outlet.id,
          name: order.outlet.name,
          slug: order.outlet.slug,
        },
      }),
      ...(order.items && {
        items: OrderItemDTO.toResponseArray(order.items),
      }),
      ...(order.statusHistory && Array.isArray(order.statusHistory) && {
        statusHistory: OrderStatusHistoryDTO.toResponseArray(order.statusHistory as any),
      }),
      // Include transaction summary if available
      ...(order.transactions && order.transactions.length > 0 && {
        transactions: order.transactions.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          paymentMethod: tx.paymentMethod,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
        })),
      }),
    };
  }

  /**
   * Transform order to public response format (for tracking page)
   * Only includes minimal, non-sensitive data
   */
  static toPublicResponse(order: OrderWithRelations) {
    return {
      trackingCode: order.trackingCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      customerName: order.customerName ? this.maskName(order.customerName) : null, // Mask name for privacy
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString() || null,
      // Minimal outlet info
      ...(order.outlet && {
        outletName: order.outlet.name,
      }),
    };
  }

  /**
   * Transform array of orders to response format
   */
  static toResponseArray(orders: OrderWithRelations[]) {
    return orders.map((order) => this.toResponse(order));
  }

  /**
   * Mask phone number for privacy (e.g., 6281234567890 -> 6281****7890)
   */
  private static maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    const start = phone.slice(0, 4);
    const end = phone.slice(-4);
    return `${start}****${end}`;
  }

  /**
   * Mask customer name for privacy (e.g., "John Doe" -> "Jo***")
   */
  private static maskName(name: string): string {
    if (name.length <= 2) return '***';
    const start = name.slice(0, 2);
    return `${start}***`;
  }
}
