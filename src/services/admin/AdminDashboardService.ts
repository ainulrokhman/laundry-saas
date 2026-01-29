/**
 * Admin Dashboard Service (SUPERADMIN)
 * 
 * Provides statistics and data for the admin dashboard overview.
 * Fetches data about users, outlets, subscriptions, and revenue.
 */

import { prisma } from '@/lib/prisma';
import { PaymentStatus, Role, TransType } from '@/generated/prisma';

// ============================================
// Interfaces
// ============================================

export interface UserStats {
  total: number;
  owners: number;
  staff: number;
  superadmins: number;
  activeUsers: number;
}

export interface OutletStats {
  total: number;
  withActiveOwner: number;
}

export interface SubscriptionStats {
  active: number;
  expiringSoon: number; // expires in 7 days
  expired: number;
  noSubscription: number;
}

export interface RevenueStats {
  monthly: number;
  total: number;
}

export interface PackageDistribution {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export interface MonthlyRevenue {
  month: string; // Format: "Jan 2026"
  revenue: number;
}

export interface RecentPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  packageName: string | null;
  userName: string | null;
  createdAt: Date;
}

export interface RecentUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  packageName: string | null;
  createdAt: Date;
}

export interface PendingPaymentStats {
  count: number;
  totalAmount: number;
}

export interface AdminDashboardStats {
  users: UserStats;
  outlets: OutletStats;
  subscriptions: SubscriptionStats;
  revenue: RevenueStats;
  pendingPayments: PendingPaymentStats;
  packageDistribution: PackageDistribution[];
  revenueByMonth: MonthlyRevenue[];
  recentPayments: RecentPayment[];
  recentUsers: RecentUser[];
}

// ============================================
// Service
// ============================================

export class AdminDashboardService {
  /**
   * Get all dashboard statistics
   */
  async getStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get first day of current month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Execute all queries in parallel for better performance
    const [
      userStats,
      outletStats,
      subscriptionStats,
      revenueStats,
      pendingPayments,
      packageDistribution,
      revenueByMonth,
      recentPayments,
      recentUsers,
    ] = await Promise.all([
      this.getUserStats(),
      this.getOutletStats(),
      this.getSubscriptionStats(now, sevenDaysFromNow),
      this.getRevenueStats(firstDayOfMonth),
      this.getPendingPaymentStats(),
      this.getPackageDistribution(),
      this.getRevenueByMonth(),
      this.getRecentPayments(),
      this.getRecentUsers(),
    ]);

    return {
      users: userStats,
      outlets: outletStats,
      subscriptions: subscriptionStats,
      revenue: revenueStats,
      pendingPayments,
      packageDistribution,
      revenueByMonth,
      recentPayments,
      recentUsers,
    };
  }

  /**
   * Get user statistics
   */
  private async getUserStats(): Promise<UserStats> {
    const [total, owners, staff, superadmins, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.OWNER } }),
      prisma.user.count({ where: { role: Role.STAFF } }),
      prisma.user.count({ where: { role: Role.SUPERADMIN } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    return { total, owners, staff, superadmins, activeUsers };
  }

  /**
   * Get outlet statistics
   */
  private async getOutletStats(): Promise<OutletStats> {
    const now = new Date();

    const [total, withActiveOwner] = await Promise.all([
      prisma.outlet.count(),
      // Outlets with owners that have active subscription
      prisma.outlet.count({
        where: {
          owner: {
            subscriptionExpiresAt: {
              gte: now,
            },
          },
        },
      }),
    ]);

    return { total, withActiveOwner };
  }

  /**
   * Get subscription statistics (based on User model)
   */
  private async getSubscriptionStats(
    now: Date,
    sevenDaysFromNow: Date
  ): Promise<SubscriptionStats> {
    // Only count OWNERs for subscription stats
    const [active, expiringSoon, expired, noSubscription] = await Promise.all([
      // Active: expires after now
      prisma.user.count({
        where: {
          role: Role.OWNER,
          subscriptionExpiresAt: {
            gte: now,
          },
        },
      }),
      // Expiring soon: expires within 7 days (but still active)
      prisma.user.count({
        where: {
          role: Role.OWNER,
          subscriptionExpiresAt: {
            gte: now,
            lte: sevenDaysFromNow,
          },
        },
      }),
      // Expired: expires before now
      prisma.user.count({
        where: {
          role: Role.OWNER,
          subscriptionExpiresAt: {
            lt: now,
          },
        },
      }),
      // No subscription: no expiry date set
      prisma.user.count({
        where: {
          role: Role.OWNER,
          subscriptionExpiresAt: null,
        },
      }),
    ]);

    return { active, expiringSoon, expired, noSubscription };
  }

  /**
   * Get revenue statistics
   */
  private async getRevenueStats(firstDayOfMonth: Date): Promise<RevenueStats> {
    const [monthlyResult, totalResult] = await Promise.all([
      // Monthly revenue (current month)
      prisma.transaction.aggregate({
        where: {
          type: TransType.SUBSCRIPTION,
          status: PaymentStatus.SETTLEMENT,
          settledAt: {
            gte: firstDayOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Total revenue (all time)
      prisma.transaction.aggregate({
        where: {
          type: TransType.SUBSCRIPTION,
          status: PaymentStatus.SETTLEMENT,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      monthly: monthlyResult._sum.amount || 0,
      total: totalResult._sum.amount || 0,
    };
  }

  /**
   * Get pending payment statistics
   */
  private async getPendingPaymentStats(): Promise<PendingPaymentStats> {
    const result = await prisma.transaction.aggregate({
      where: {
        type: TransType.SUBSCRIPTION,
        status: PaymentStatus.PENDING,
      },
      _count: true,
      _sum: {
        amount: true,
      },
    });

    return {
      count: result._count,
      totalAmount: result._sum.amount || 0,
    };
  }

  /**
   * Get package distribution (how many users per package)
   */
  private async getPackageDistribution(): Promise<PackageDistribution[]> {
    // Get all packages with user count
    const packages = await prisma.subscriptionPackage.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            users: {
              where: {
                role: Role.OWNER,
              },
            },
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // Calculate total for percentage
    const totalUsers = packages.reduce((sum, pkg) => sum + pkg._count.users, 0);

    return packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      count: pkg._count.users,
      percentage: totalUsers > 0 ? Math.round((pkg._count.users / totalUsers) * 100) : 0,
    }));
  }

  /**
   * Get revenue by month (last 6 months)
   */
  private async getRevenueByMonth(): Promise<MonthlyRevenue[]> {
    const result: MonthlyRevenue[] = [];
    const now = new Date();

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const revenue = await prisma.transaction.aggregate({
        where: {
          type: TransType.SUBSCRIPTION,
          status: PaymentStatus.SETTLEMENT,
          settledAt: {
            gte: date,
            lt: nextMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Format month name
      const monthName = date.toLocaleDateString('id-ID', {
        month: 'short',
        year: 'numeric',
      });

      result.push({
        month: monthName,
        revenue: revenue._sum.amount || 0,
      });
    }

    return result;
  }

  /**
   * Get recent payments (last 5)
   */
  private async getRecentPayments(): Promise<RecentPayment[]> {
    const transactions = await prisma.transaction.findMany({
      where: {
        type: TransType.SUBSCRIPTION,
      },
      include: {
        package: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      packageName: t.package?.name || null,
      userName: t.user?.name || null,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get recent users (last 5 registered owners)
   */
  private async getRecentUsers(): Promise<RecentUser[]> {
    const users = await prisma.user.findMany({
      where: {
        role: Role.OWNER,
      },
      include: {
        package: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      packageName: u.package?.name || null,
      createdAt: u.createdAt,
    }));
  }
}
