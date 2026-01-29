/**
 * Subscription Payment Service Tests (OWNER)
 * 
 * Tests for owner-side subscription payment operations
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SubscriptionPaymentService } from '@/services/dashboard/SubscriptionPaymentService';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData } from '../utils/factories';
import { PaymentStatus, TransType } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('SubscriptionPaymentService', () => {
    const prisma = createTestPrismaClient();
    const service = new SubscriptionPaymentService();

    beforeEach(async () => {
        await cleanupTestDatabase(prisma);
    });

    afterAll(async () => {
        await cleanupTestDatabase(prisma);
        await prisma.$disconnect();
    });

    describe('getCurrentSubscription', () => {
        it('should return active subscription status', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

            const outlet = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'test-outlet' }),
                    subscriptionTier: 'PRO',
                    subscriptionExpiresAt: futureDate,
                    subscriptionStartedAt: new Date(),
                },
            });

            const status = await service.getCurrentSubscription(outlet.id);

            expect(status.tier).toBe('PRO');
            expect(status.isActive).toBe(true);
            expect(status.isExpired).toBe(false);
            expect(status.daysRemaining).toBeGreaterThan(14);
            expect(status.daysRemaining).toBeLessThanOrEqual(15);
        });

        it('should return expired subscription status', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

            const outlet = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'test-outlet' }),
                    subscriptionTier: 'PRO',
                    subscriptionExpiresAt: pastDate,
                    subscriptionStartedAt: new Date('2024-01-01'),
                },
            });

            const status = await service.getCurrentSubscription(outlet.id);

            expect(status.tier).toBe('PRO');
            expect(status.isActive).toBe(false);
            expect(status.isExpired).toBe(true);
            expect(status.daysRemaining).toBeLessThan(0);
        });

        it('should handle outlets without subscription', async () => {
            const outlet = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'free-outlet' }),
                    subscriptionTier: 'FREE',
                    subscriptionExpiresAt: null,
                },
            });

            const status = await service.getCurrentSubscription(outlet.id);

            expect(status.tier).toBe('FREE');
            expect(status.expiresAt).toBeNull();
            expect(status.isActive).toBe(false);
            expect(status.isExpired).toBe(false);
            expect(status.daysRemaining).toBeNull();
        });

        it('should throw error if outlet not found', async () => {
            await expect(
                service.getCurrentSubscription('non-existent-id')
            ).rejects.toThrow('Outlet not found');
        });
    });

    describe('uploadPaymentProof', () => {
        it('should create pending transaction with proof', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            const bankAccount = await prisma.bankAccount.create({
                data: {
                    outletId: outlet.id,
                    bankName: 'BCA',
                    accountNumber: '1234567890',
                    accountName: 'Test Account',
                },
            });

            const transactionId = await service.uploadPaymentProof(outlet.id, {
                amount: 150000,
                proofUrl: 'https://cloudinary.com/proof.jpg',
                bankAccountId: bankAccount.id,
                description: 'Test payment',
            });

            expect(transactionId).toBeDefined();

            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
            });

            expect(transaction).toBeDefined();
            expect(transaction?.outletId).toBe(outlet.id);
            expect(transaction?.type).toBe(TransType.SUBSCRIPTION);
            expect(transaction?.amount).toBe(150000);
            expect(transaction?.status).toBe(PaymentStatus.PENDING);
            expect(transaction?.proofUrl).toBe('https://cloudinary.com/proof.jpg');
            expect(transaction?.bankAccountId).toBe(bankAccount.id);
        });

        it('should throw error if bank account not found', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await expect(
                service.uploadPaymentProof(outlet.id, {
                    amount: 100000,
                    proofUrl: 'https://example.com/proof.jpg',
                    bankAccountId: 'non-existent-bank-id',
                })
            ).rejects.toThrow('Bank account not found');
        });
    });

    describe('getPaymentHistory', () => {
        it('should return subscription payments only', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            // Create subscription payment
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            // Create laundry order payment (should not appear)
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.LAUNDRY_ORDER,
                    amount: 50000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'CASH',
                },
            });

            const history = await service.getPaymentHistory(outlet.id);

            expect(history).toHaveLength(1);
            expect(history[0].type).toBe(TransType.SUBSCRIPTION);
            expect(history[0].amount).toBe(100000);
        });

        it('should return payments ordered by creation date (newest first)', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            const tx1 = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                    createdAt: new Date('2024-01-01'),
                },
            });

            const tx2 = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 150000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                    createdAt: new Date('2024-01-15'),
                },
            });

            const history = await service.getPaymentHistory(outlet.id);

            expect(history[0].id).toBe(tx2.id); // Newest first
            expect(history[1].id).toBe(tx1.id);
        });

        it('should limit results to 50 payments', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            // Create 60 transactions
            for (let i = 0; i < 60; i++) {
                await prisma.transaction.create({
                    data: {
                        outletId: outlet.id,
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.SETTLEMENT,
                        paymentMethod: 'TRANSFER',
                    },
                });
            }

            const history = await service.getPaymentHistory(outlet.id);

            expect(history.length).toBeLessThanOrEqual(50);
        });
    });
});
