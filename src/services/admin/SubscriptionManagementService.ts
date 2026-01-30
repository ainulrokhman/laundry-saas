/**
 * Subscription Management Service (SUPERADMIN)
 * 
 * Handles subscription management, payment verification, and renewals for superadmin.
 */

import { prisma } from '@/lib/prisma';
import { PaymentStatus, TransType } from '@/generated/prisma';

export interface SubscriptionListItem {
    outletId: string;
    outletName: string;
    outletSlug: string;
    tier: string | null;
    expiresAt: Date | null;
    startedAt: Date | null;
    daysRemaining: number | null;
    isExpired: boolean;
    ownerName: string | null;
    ownerPhone: string | null;
}

export interface PendingPayment {
    id: string;
    amount: number;
    proofUrl: string | null;
    createdAt: Date;
    bankAccount: {
        bankName: string;
        accountNumber: string;
    } | null;
    // User info (owner who pays)
    userId: string;
    userName: string;
    userPhone: string;
    // Package info
    packageId: string | null;
    packageName: string | null;
    packagePrice: number | null;
}

export interface SubscriptionStats {
    totalOutlets: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    pendingPayments: number;
    totalRevenue: number;
}

export class SubscriptionManagementService {
    /**
     * Get all outlet subscriptions
     */
    async getAllSubscriptions(): Promise<SubscriptionListItem[]> {
        const outlets = await prisma.outlet.findMany({
            include: {
                owner: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: {
                subscriptionExpiresAt: 'asc',
            },
        });

        const now = new Date();

        return outlets.map((outlet) => {
            const expiresAt = outlet.subscriptionExpiresAt;
            const daysRemaining = expiresAt
                ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                outletId: outlet.id,
                outletName: outlet.name,
                outletSlug: outlet.slug,
                tier: outlet.subscriptionTier,
                expiresAt: outlet.subscriptionExpiresAt,
                startedAt: outlet.subscriptionStartedAt,
                daysRemaining,
                isExpired: expiresAt ? expiresAt < now : false,
                ownerName: outlet.owner?.name || null,
                ownerPhone: outlet.owner?.phone || null,
            };
        });
    }

    /**
     * Get pending subscription payments
     */
    async getPendingPayments(): Promise<PendingPayment[]> {
        const transactions = await prisma.transaction.findMany({
            where: {
                type: TransType.SUBSCRIPTION,
                status: PaymentStatus.PENDING,
            },
            include: {
                bankAccount: {
                    select: {
                        bankName: true,
                        accountNumber: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                package: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return transactions.map((t) => ({
            id: t.id,
            amount: t.amount,
            proofUrl: t.proofUrl,
            createdAt: t.createdAt,
            bankAccount: t.bankAccount,
            // User info
            userId: t.user?.id || '',
            userName: t.user?.name || 'Unknown',
            userPhone: t.user?.phone || '',
            // Package info
            packageId: t.package?.id || null,
            packageName: t.package?.name || null,
            packagePrice: t.package?.price || null,
        }));
    }

    /**
     * Approve payment and extend subscription
     */
    async approvePayment(
        transactionId: string,
        durationDays: number
    ): Promise<void> {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                package: true, // Include package info
            },
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.status !== PaymentStatus.PENDING) {
            throw new Error('Transaction is not pending');
        }

        if (!transaction.userId) {
            throw new Error('Transaction has no associated user');
        }

        const user = await prisma.user.findUnique({
            where: { id: transaction.userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Calculate new expiry date
        const now = new Date();
        const currentExpiry = user.subscriptionExpiresAt;

        // If current subscription is still active, extend from expiry date
        // Otherwise, start from now
        const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
        const newExpiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Update transaction status and user subscription
        await prisma.$transaction([
            // Mark transaction as settled
            prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: PaymentStatus.SETTLEMENT,
                    settledAt: now,
                },
            }),
            // Update user subscription
            prisma.user.update({
                where: { id: transaction.userId },
                data: {
                    packageId: transaction.packageId, // Assign purchased package
                    subscriptionExpiresAt: newExpiryDate,
                    subscriptionStartedAt: user.subscriptionStartedAt || now,
                },
            }),
        ]);
    }

    /**
     * Reject payment
     */
    async rejectPayment(
        transactionId: string,
        reason: string
    ): Promise<void> {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.status !== PaymentStatus.PENDING) {
            throw new Error('Transaction is not pending');
        }

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: PaymentStatus.FAILURE,
            },
        });
    }

    /**
     * Get subscription statistics
     */
    async getSubscriptionStats(): Promise<SubscriptionStats> {
        const now = new Date();

        const [
            totalOutlets,
            activeSubscriptions,
            expiredSubscriptions,
            pendingPayments,
            totalRevenue,
        ] = await Promise.all([
            prisma.outlet.count(),
            prisma.outlet.count({
                where: {
                    subscriptionExpiresAt: {
                        gte: now,
                    },
                },
            }),
            prisma.outlet.count({
                where: {
                    subscriptionExpiresAt: {
                        lt: now,
                    },
                },
            }),
            prisma.transaction.count({
                where: {
                    type: TransType.SUBSCRIPTION,
                    status: PaymentStatus.PENDING,
                },
            }),
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
            totalOutlets,
            activeSubscriptions,
            expiredSubscriptions,
            pendingPayments,
            totalRevenue: totalRevenue._sum.amount || 0,
        };
    }
}
