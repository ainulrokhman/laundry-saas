/**
 * Accounting Service
 * 
 * Business logic untuk perhitungan keuangan, laba kotor, dan analisis HPP.
 */

import { BaseService } from "./BaseService";
import { SessionUser } from "@/lib/session";
import { OrderRepository } from "@/repositories/OrderRepository";
import { PaymentStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ProfitReportInput = {
  startDate: string; // ISO
  endDate: string;   // ISO
};

export class AccountingService extends BaseService {
  constructor(
    private orderRepository: OrderRepository = new OrderRepository(),
  ) {
    super();
  }

  /**
   * Mendapatkan laporan laba kotor untuk outlet tertentu
   */
  async getGrossProfitReport(user: SessionUser | null, input: ProfitReportInput) {
    this.requireRole(user, ["OWNER", "STAFF"]);
    const outletId = this.getOutletId(user);

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Format tanggal tidak valid");
    }

    // Set time to end of day for the end date
    end.setHours(23, 59, 59, 999);

    // Ambil semua order yang lunas (SETTLEMENT) dalam rentang waktu tersebut
    const orders = await this.orderRepository.findByOutletId(outletId, {
      dateFrom: start,
      dateTo: end,
      paymentStatus: PaymentStatus.SETTLEMENT,
    });

    let totalRevenue = 0;
    let totalCogs = 0;

    orders.forEach((order: any) => {
      totalRevenue += Number(order.totalAmount || 0);
      totalCogs += Number(order.totalCogs || 0);
    });

    const grossProfit = totalRevenue - totalCogs;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCogs,
      grossProfit,
      profitMargin: Number(profitMargin.toFixed(2)),
      orderCount: orders.length,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  /**
   * Laporan global (multi-outlet) untuk OWNER
   */
  async getGlobalGrossProfitReport(user: SessionUser | null, outletIds: string[], input: ProfitReportInput) {
    this.requireRole(user, ["OWNER"]);
    
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Format tanggal tidak valid");
    }

    end.setHours(23, 59, 59, 999);

    // TODO: Implement more efficient aggregation in OrderRepository if needed
    // For now, let's use the basic multi-outlet query
    
    // We need totalCogs which is not in getGlobalStatsByDateRange yet.
    // Let's create a specialized query or extend the repository.
    
    // For now, let's just do a manual aggregation to stay consistent with the HPP feature.
    const orders = await prisma.order.findMany({
      where: {
        outletId: { in: outletIds },
        createdAt: { gte: start, lte: end },
        paymentStatus: PaymentStatus.SETTLEMENT,
      },
      select: {
        totalAmount: true,
        totalCogs: true,
      }
    });

    let totalRevenue = 0;
    let totalCogs = 0;

    orders.forEach((o: any) => {
      totalRevenue += Number(o.totalAmount || 0);
      totalCogs += Number(o.totalCogs || 0);
    });

    const grossProfit = totalRevenue - totalCogs;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCogs,
      grossProfit,
      profitMargin: Number(profitMargin.toFixed(2)),
      orderCount: orders.length,
    };
  }
}
