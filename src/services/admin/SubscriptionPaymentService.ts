/**
 * Subscription Payment Service
 *
 * Business logic for subscription payment verification (SUPERADMIN only)
 * Handles approve/reject workflows and security logging
 */

import { TransactionRepository } from '@/repositories/TransactionRepository';
import { PaymentStatus, TransType } from '@/generated/prisma';
import { securityLogService, SecurityEventType } from '../security/SecurityLogService';
import { prisma } from '@/lib/prisma';

export interface SubscriptionPaymentFilters {
    status?: PaymentStatus;
    page?: number;
    limit?: number;
    search?: string;
}

export interface SubscriptionPaymentStats {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
}

export class SubscriptionPaymentService {
    private transactionRepo: TransactionRepository;

    constructor() {
        this.transactionRepo = new TransactionRepository();
    }

    /**
     * Get list of subscription payments with filters
     */
    async getPayments(filters?: SubscriptionPaymentFilters) {
        const result = await this.transactionRepo.findSubscriptionPayments({
            status: filters?.status,
            page: filters?.page || 1,
            limit: filters?.limit || 50,
            search: filters?.search,
        });

        const totalPages = Math.ceil(result.total / (filters?.limit || 50));

        return {
            data: result.data,
            pagination: {
                page: filters?.page || 1,
                limit: filters?.limit || 50,
                total: result.total,
                totalPages,
            },
        };
    }

    /**
     * Get single subscription payment by ID with full details
     */
    async getPaymentById(id: string) {
        const payment = await this.transactionRepo.findSubscriptionPaymentById(id);

        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.type !== TransType.SUBSCRIPTION) {
            throw new Error('Transaction is not a subscription payment');
        }

        return payment;
    }

    /**
     * Approve subscription payment
     * Updates status to SETTLEMENT and logs action
     */
    async approvePayment(paymentId: string, adminUserId: string) {
        // Get payment details first
        const payment = await this.getPaymentById(paymentId);

        // Validate payment can be approved
        if (payment.status !== PaymentStatus.PENDING) {
            throw new Error(`Cannot approve payment with status: ${payment.status}. Only PENDING payments can be approved.`);
        }

        // Update payment status
        const updated = await this.transactionRepo.updatePaymentStatus(
            paymentId,
            PaymentStatus.SETTLEMENT,
            new Date()
        );

        // ACTIVATE SUBSCRIPTION
        // If payment is for a subscription package, update the User's subscription details
        if (payment.packageId && payment.userId) {
            const pkg = await prisma.subscriptionPackage.findUnique({
                where: { id: payment.packageId },
            });

            if (pkg) {
                const now = new Date();
                // Default duration 30 days if not specified in logic (assuming monthly for now)
                // In future, package could have 'durationInDays' field.
                // For now hardcode 30 days or derived from package name if needed. 
                // Let's assume standard 30 days unless we have data.
                const daysToAdd = 30;
                const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

                await prisma.user.update({
                    where: { id: payment.userId },
                    data: {
                        package: {
                            connect: { id: pkg.id }
                        },
                        subscriptionStartedAt: now,
                        subscriptionExpiresAt: expiresAt,
                    },
                });
            }
        }

        // Log admin action
        await securityLogService.logEvent({
            eventType: SecurityEventType.ADMIN_USER_UPDATE,
            userId: adminUserId,
            success: true,
            metadata: {
                action: 'APPROVE_SUBSCRIPTION_PAYMENT',
                resource: 'Transaction',
                resourceId: paymentId,
                transactionId: paymentId,
                amount: payment.amount,
                outletId: payment.outletId,
                previousStatus: payment.status,
                newStatus: PaymentStatus.SETTLEMENT,
            },
        });

        return updated;
    }

    /**
     * Reject subscription payment
     * Updates status to FAILURE and logs action
     */
    async rejectPayment(paymentId: string, adminUserId: string, reason?: string) {
        // Get payment details first
        const payment = await this.getPaymentById(paymentId);

        // Validate payment can be rejected
        if (payment.status !== PaymentStatus.PENDING) {
            throw new Error(`Cannot reject payment with status: ${payment.status}. Only PENDING payments can be rejected.`);
        }

        // Update payment status
        const updated = await this.transactionRepo.updatePaymentStatus(
            paymentId,
            PaymentStatus.FAILURE
        );

        // Log admin action
        await securityLogService.logEvent({
            eventType: SecurityEventType.ADMIN_USER_UPDATE,
            userId: adminUserId,
            success: true,
            metadata: {
                action: 'REJECT_SUBSCRIPTION_PAYMENT',
                resource: 'Transaction',
                resourceId: paymentId,
                transactionId: paymentId,
                amount: payment.amount,
                outletId: payment.outletId,
                previousStatus: payment.status,
                newStatus: PaymentStatus.FAILURE,
                reason: reason || 'No reason provided',
            },
        });

        return updated;
    }

    /**
     * Get subscription payment statistics
     */
    async getStats(): Promise<SubscriptionPaymentStats> {
        return this.transactionRepo.getSubscriptionPaymentStats();
    }
}
