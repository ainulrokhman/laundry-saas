/**
 * Dashboard DTO
 *
 * Data Transfer Objects for dashboard responses.
 * Ensures sensitive data is scrubbed before sending to client.
 */

import { DashboardStats, RecentOrder } from "@/services/DashboardService";

export class DashboardDTO {
  /**
   * Transform dashboard stats to response format
   */
  static statsToResponse(stats: DashboardStats) {
    return {
      ordersToday: stats.ordersToday,
      revenueToday: stats.revenueToday,
      pendingOrders: stats.pendingOrders,
      totalCustomers: stats.totalCustomers,
    };
  }

  /**
   * Transform recent order to response format
   */
  static recentOrderToResponse(order: RecentOrder) {
    return {
      id: order.id,
      trackingCode: order.trackingCode,
      customerName: order.customerName || "Pelanggan",
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt.toISOString(),
      // Include outlet info for global mode
      ...(order.outletId && { outletId: order.outletId }),
      ...(order.outletName && { outletName: order.outletName }),
    };
  }

  /**
   * Transform array of recent orders to response format
   */
  static recentOrdersToResponse(orders: RecentOrder[]) {
    return orders.map((order) => this.recentOrderToResponse(order));
  }
}
