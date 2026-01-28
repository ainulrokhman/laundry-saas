import { BaseService } from './BaseService';
import { OrderRepository } from '@/repositories/OrderRepository';
import { SessionUser } from '@/lib/session';
import { ReportsResponseDTO } from '@/dto/ReportsDTO';
import { Role } from '@/generated/prisma';

export class ReportsService extends BaseService {
    private orderRepository: OrderRepository;

    constructor() {
        super();
        this.orderRepository = new OrderRepository();
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
                averageOrderValue,
            },
            dailyStats,
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
        };
    }
}
