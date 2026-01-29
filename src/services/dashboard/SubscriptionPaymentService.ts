/**
 * Subscription Payment Service (OWNER)
 * 
 * Handles subscription payment proof uploads and payment history for outlet owners.
 */

import { prisma } from '@/lib/prisma';
import { PaymentStatus, TransType } from '@/generated/prisma';
import { TransactionRepository } from '@/repositories/TransactionRepository';

export interface CurrentSubscription {
    tier: string | null;
    expiresAt: Date | null;
    startedAt: Date | null;
    daysRemaining: number | null;
    isExpired: boolean;
    isActive: boolean;
}

export interface PaymentProofData {
    amount: number;
    proofUrl: string;
    bankAccountId: string;
    description?: string;
}

export class SubscriptionPaymentService {
    private transactionRepo: TransactionRepository;

    constructor() {
        this.transactionRepo = new TransactionRepository();
    }

    /**
     * Get current subscription status for OWNER (User based)
     */
    async getCurrentSubscription(userId: string): Promise<CurrentSubscription> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { package: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const now = new Date();
        const expiresAt = user.subscriptionExpiresAt;
        const daysRemaining = expiresAt
            ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        return {
            tier: user.package?.name || 'Free Trial',
            expiresAt: user.subscriptionExpiresAt,
            startedAt: user.subscriptionStartedAt,
            daysRemaining,
            isExpired: expiresAt ? expiresAt < now : false,
            isActive: expiresAt ? expiresAt >= now : false,
        };
    }

    /**
     * Upload payment proof and create pending transaction
     */
    async uploadPaymentProof(
        userId: string,
        data: PaymentProofData
    ): Promise<string> {
        // Create transaction with PENDING status
        // Note: For subscriptions, bankAccountId might be null if using external manual transfer info 
        // derived from UI, but if we track our own receiving accounts, we can validate.
        // Simplified for Phase 4: accept upload without strict bankAccount check if not provided.

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: TransType.SUBSCRIPTION,
                amount: data.amount,
                status: PaymentStatus.PENDING,
                paymentMethod: 'TRANSFER',
                proofUrl: data.proofUrl,
                bankAccountId: data.bankAccountId || null, // Optional
            },
        });

        return transaction.id;
    }

    /**
     * Get payment history for OWNER (User based)
     */
    async getPaymentHistory(userId: string) {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                type: TransType.SUBSCRIPTION,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
            include: {
                package: true, // Include package details
            },
        });

        return transactions;
    }
}
