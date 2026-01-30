import { BaseService } from './BaseService';
import { OrderRepository } from '@/repositories/OrderRepository';
import { SessionUser } from '@/lib/session';
import { ReportsResponseDTO, GlobalReportsResponseDTO } from '@/dto/ReportsDTO';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { PackageFeatureService } from '@/services/PackageFeatureService';
import { PackageFeature } from '@/constants/packageFeatures';

import { ExpenseRepository } from '@/repositories/ExpenseRepository';

export class ReportsService extends BaseService {
    private orderRepository: OrderRepository;
    private expenseRepository: ExpenseRepository;
    private packageFeatureService: PackageFeatureService;

    constructor() {
        super();
        this.orderRepository = new OrderRepository();
        this.expenseRepository = new ExpenseRepository();
        this.packageFeatureService = new PackageFeatureService();
    }

    /**
     * Get reports for a specific date range (Single Outlet)
     */
    async getReports(
        user: SessionUser | null,
        startDate: Date,
        endDate: Date
    ): Promise<ReportsResponseDTO> {
        this.requireRole(user, [Role.OWNER, Role.SUPERADMIN]);
        const outletId = this.getOutletId(user);

        // Check features
        const hasPL = await this.packageFeatureService.hasFeature(outletId, PackageFeature.REPORT_SIMPLE_PL);

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

        // Get total expenses (Only if has PL feature)
        const totalExpense = hasPL
            ? await this.expenseRepository.getTotalExpenses(outletId, startDate, endDate)
            : 0;

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

    /**
     * Get global reports aggregated from all owned outlets (OWNER only)
     */
    async getGlobalReports(
        user: SessionUser | null,
        startDate: Date,
        endDate: Date
    ): Promise<GlobalReportsResponseDTO> {
        this.requireRole(user, [Role.OWNER]);

        if (!user) {
            throw new Error('Authentication required');
        }

        // Check if user (via one of their outlets or directly) has Consolidated Report feature
        // Since it's global, we check the owner's package directly or via any outlet. 
        // Best to check via one outlet ID since hasFeature takes outletId.
        // Let's get one outlet to check feature.
        const firstOutlet = await prisma.outlet.findFirst({
            where: { ownerId: user.userId },
            select: { id: true }
        });

        if (firstOutlet) {
            const hasConsolidated = await this.packageFeatureService.hasFeature(firstOutlet.id, PackageFeature.REPORT_CONSOLIDATED);
            if (!hasConsolidated) {
                throw new Error('Upgrade paket Anda untuk mengakses Laporan Laba Rugi Gabungan.');
            }
        }

        // Get all outlets owned by this user
        const ownedOutlets = await prisma.outlet.findMany({
            where: { ownerId: user.userId },
            select: { id: true, name: true },
        });

        const outletIds = ownedOutlets.map(o => o.id);

        if (outletIds.length === 0) {
            return this.emptyGlobalReports(startDate, endDate);
        }

        // Get aggregated stats from all outlets
        const [
            stats,
            dailyStats,
            totalExpense,
            paymentMethods,
            unpaidOrdersRaw,
            revenueBreakdown,
            expenseBreakdown,
        ] = await Promise.all([
            this.orderRepository.getGlobalStatsByDateRange(outletIds, startDate, endDate),
            this.orderRepository.getGlobalDailyStats(outletIds, startDate, endDate),
            this.expenseRepository.getGlobalTotalExpenses(outletIds, startDate, endDate),
            this.orderRepository.getGlobalPaymentMethodStats(outletIds, startDate, endDate),
            this.orderRepository.getGlobalUnpaidOrders(outletIds),
            this.orderRepository.getPerOutletBreakdown(outletIds, startDate, endDate),
            this.expenseRepository.getPerOutletExpenseBreakdown(outletIds, startDate, endDate),
        ]);

        // Map unpaid orders with outlet name
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
            outletName: o.outlet?.name || 'Unknown',
        }));

        // Build per-outlet breakdown with expenses
        const expenseMap = new Map(expenseBreakdown.map(e => [e.outletId, e.totalExpense]));
        const outletBreakdown = revenueBreakdown.map(r => {
            const expense = expenseMap.get(r.outletId) || 0;
            return {
                outletId: r.outletId,
                outletName: r.outletName,
                totalOrders: r.totalOrders,
                totalRevenue: r.totalRevenue,
                totalExpense: expense,
                netProfit: r.totalRevenue - expense,
            };
        });

        // Add outlets with no orders (but might have expenses)
        const outletIdsWithRevenue = new Set(revenueBreakdown.map(r => r.outletId));
        for (const outlet of ownedOutlets) {
            if (!outletIdsWithRevenue.has(outlet.id)) {
                const expense = expenseMap.get(outlet.id) || 0;
                outletBreakdown.push({
                    outletId: outlet.id,
                    outletName: outlet.name,
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalExpense: expense,
                    netProfit: -expense,
                });
            }
        }

        // Sort by revenue descending
        outletBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue);

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
            outletBreakdown,
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            totalOutlets: outletIds.length,
        };
    }

    /**
     * Return empty global reports structure
     */
    private emptyGlobalReports(startDate: Date, endDate: Date): GlobalReportsResponseDTO {
        return {
            summary: {
                totalOrders: 0,
                totalRevenue: 0,
                totalCustomers: 0,
                totalExpense: 0,
                netProfit: 0,
                averageOrderValue: 0,
            },
            dailyStats: [],
            paymentMethods: [],
            unpaidOrders: [],
            outletBreakdown: [],
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            totalOutlets: 0,
        };
    }
}
