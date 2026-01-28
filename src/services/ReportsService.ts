import { BaseService } from './BaseService';
import { OrderRepository } from '@/repositories/OrderRepository';
import { SessionUser } from '@/lib/session';
import { ReportsResponseDTO } from '@/dto/ReportsDTO';
import { Role } from '@/generated/prisma';

import { ExpenseRepository } from '@/repositories/ExpenseRepository';

export class ReportsService extends BaseService {
    private orderRepository: OrderRepository;
    private expenseRepository: ExpenseRepository;

    constructor() {
        super();
        this.orderRepository = new OrderRepository();
        this.expenseRepository = new ExpenseRepository();
    }

    /**
     * Get reports for a specific date range
     */
    async getReports(
        user: SessionUser | null,
        startDate: Date,
        endDate: Date
    ): Promise<ReportsResponseDTO> {
        this.requireRole(user, [Role.OWNER, Role.SUPERADMIN]);
        const outletId = this.getOutletId(user);

        // Get aggregated stats
        const stats = await this.orderRepository.getStatsByDateRange(
            outletId,
            startDate,
            endDate
        );

        // Get daily stats for charts
        const dailyStats = await this.orderRepository.getDailyStats(
            outletId,
            startDate,
            endDate
        );

        // Get total expenses
        const totalExpense = await this.expenseRepository.getTotalExpenses(outletId, startDate, endDate);

        // Get payment method stats
        const paymentMethods = await this.orderRepository.getPaymentMethodStats(outletId, startDate, endDate);

        // Get unpaid orders
        const unpaidOrdersRaw = await this.orderRepository.getUnpaidOrders(outletId);

        const unpaidOrders = unpaidOrdersRaw.map(o => ({
            id: o.id,
            trackingCode: o.trackingCode,
            customerName: o.customerName || 'Guest',
            totalAmount: o.totalAmount,
            paidAmount: o.dpAmount,
            remainingAmount: o.totalAmount - o.dpAmount,
            status: o.status,
            paymentStatus: o.paymentStatus,
            createdAt: o.createdAt.toISOString(),
        }));

        // Calculate average order value
        const averageOrderValue =
            stats.totalOrders > 0
                ? Math.round(stats.totalRevenue / stats.totalOrders)
                : 0;

        return {
            summary: {
                totalOrders: stats.totalOrders,
                totalRevenue: stats.totalRevenue,
                totalCustomers: stats.totalCustomers,

                totalExpense,
                netProfit: stats.totalRevenue - totalExpense,
                averageOrderValue,
            },
            dailyStats,
            paymentMethods,
            unpaidOrders,
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
        };
    }
}
