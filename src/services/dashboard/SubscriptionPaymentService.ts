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
     * Get current subscription status for outlet
     */
    async getCurrentSubscription(outletId: string): Promise<CurrentSubscription> {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            select: {
                subscriptionTier: true,
                subscriptionExpiresAt: true,
                subscriptionStartedAt: true,
            },
        });

        if (!outlet) {
            throw new Error('Outlet not found');
        }

        const now = new Date();
        const expiresAt = outlet.subscriptionExpiresAt;
        const daysRemaining = expiresAt
            ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        return {
            tier: outlet.subscriptionTier,
            expiresAt: outlet.subscriptionExpiresAt,
            startedAt: outlet.subscriptionStartedAt,
            daysRemaining,
            isExpired: expiresAt ? expiresAt < now : false,
            isActive: expiresAt ? expiresAt >= now : false,
        };
    }

    /**
     * Upload payment proof and create pending transaction
     */
    async uploadPaymentProof(
        outletId: string,
        data: PaymentProofData
    ): Promise<string> {
        // Validate bank account belongs to some outlet (for receiving payment)
        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id: data.bankAccountId },
        });

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }

        // Create transaction with PENDING status
        const transaction = await prisma.transaction.create({
            data: {
                outletId,
                type: TransType.SUBSCRIPTION,
                amount: data.amount,
                status: PaymentStatus.PENDING,
                paymentMethod: 'TRANSFER',
                proofUrl: data.proofUrl,
                bankAccountId: data.bankAccountId,
            },
        });

        return transaction.id;
    }

    /**
     * Get payment history for outlet
     */
    async getPaymentHistory(outletId: string) {
        const transactions = await this.transactionRepo.find(outletId, {
            where: {
                type: TransType.SUBSCRIPTION,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
            include: {
                bankAccount: {
                    select: {
                        bankName: true,
                        accountNumber: true,
                    },
                },
            },
        });

        return transactions;
    }
}
