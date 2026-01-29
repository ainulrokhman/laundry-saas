/**
 * Subscription Management Service Tests (SUPERADMIN)
 * 
 * Tests for admin subscription management, payment approval/rejection
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createUserData } from '../utils/factories';
import { PaymentStatus, TransType } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('SubscriptionManagementService', () => {
    const prisma = createTestPrismaClient();
    const service = new SubscriptionManagementService();

    beforeEach(async () => {
        await cleanupTestDatabase(prisma);
    });

    afterAll(async () => {
        await cleanupTestDatabase(prisma);
        await prisma.$disconnect();
    });

    describe('getAllSubscriptions', () => {
        it('should return all outlet subscriptions with correct data', async () => {
            // Create outlets with different subscription statuses
            const outlet1 = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'active-outlet' }),
                    subscriptionTier: 'PRO',
                    subscriptionExpiresAt: new Date('2025-12-31'),
                    subscriptionStartedAt: new Date('2025-01-01'),
                },
            });

            const owner1 = await prisma.user.create({
                data: {
                    ...createUserData({ role: 'OWNER' }),
                    outletId: outlet1.id,
                },
            });

            const outlet2 = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'expired-outlet' }),
                    subscriptionTier: 'PRO',
                    subscriptionExpiresAt: new Date('2024-01-01'), // Expired
                    subscriptionStartedAt: new Date('2023-01-01'),
                },
            });

            const subscriptions = await service.getAllSubscriptions();

            expect(subscriptions).toHaveLength(2);
            expect(subscriptions[0].outletName).toBeDefined();
            expect(subscriptions[0].tier).toBeDefined();
            expect(subscriptions[0].daysRemaining).toBeDefined();

            // Check expired status
            const expiredSub = subscriptions.find(s => s.outletSlug === 'expired-outlet');
            expect(expiredSub?.isExpired).toBe(true);
        });

        it('should calculate days remaining correctly', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

            const outlet = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'test-outlet' }),
                    subscriptionExpiresAt: futureDate,
                },
            });

            const subscriptions = await service.getAllSubscriptions();
            const sub = subscriptions.find(s => s.outletSlug === 'test-outlet');

            expect(sub?.daysRemaining).toBeGreaterThan(29);
            expect(sub?.daysRemaining).toBeLessThanOrEqual(30);
            expect(sub?.isExpired).toBe(false);
        });
    });

    describe('getPendingPayments', () => {
        it('should return only pending subscription payments', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            // Create pending payment
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                    proofUrl: 'https://example.com/proof.jpg',
                },
            });

            // Create settled payment (should not appear)
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 50000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            const pending = await service.getPendingPayments();

            expect(pending).toHaveLength(1);
            expect(pending[0].amount).toBe(100000);
            expect(pending[0].proofUrl).toBe('https://example.com/proof.jpg');
        });
    });

    describe('approvePayment', () => {
        it('should approve payment and extend subscription', async () => {
            const outlet = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'test-outlet' }),
                    subscriptionTier: 'FREE',
                    subscriptionExpiresAt: null,
                },
            });

            const transaction = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await service.approvePayment(transaction.id, 30);

            // Check transaction updated
            const updatedTx = await prisma.transaction.findUnique({
                where: { id: transaction.id },
            });
            expect(updatedTx?.status).toBe(PaymentStatus.SETTLEMENT);

            // Check outlet updated
            const updatedOutlet = await prisma.outlet.findUnique({
                where: { id: outlet.id },
            });
            expect(updatedOutlet?.subscriptionTier).toBe('PRO');
            expect(updatedOutlet?.isPro).toBe(true);
            expect(updatedOutlet?.subscriptionExpiresAt).toBeDefined();
        });

        it('should extend from current expiry if subscription is active', async () => {
            const currentExpiry = new Date();
            currentExpiry.setDate(currentExpiry.getDate() + 10); // Active, expires in 10 days

            const outlet = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'test-outlet' }),
                    subscriptionTier: 'PRO',
                    subscriptionExpiresAt: currentExpiry,
                },
            });

            const transaction = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await service.approvePayment(transaction.id, 30);

            const updatedOutlet = await prisma.outlet.findUnique({
                where: { id: outlet.id },
            });

            // New expiry should be current expiry + 30 days
            const expectedExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
            const actualExpiry = updatedOutlet?.subscriptionExpiresAt;

            expect(actualExpiry).toBeDefined();
            if (actualExpiry) {
                const diff = Math.abs(actualExpiry.getTime() - expectedExpiry.getTime());
                expect(diff).toBeLessThan(1000); // Within 1 second
            }
        });

        it('should throw error if transaction not found', async () => {
            await expect(
                service.approvePayment('non-existent-id', 30)
            ).rejects.toThrow('Transaction not found');
        });

        it('should throw error if transaction not pending', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            const transaction = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT, // Already settled
                    paymentMethod: 'TRANSFER',
                },
            });

            await expect(
                service.approvePayment(transaction.id, 30)
            ).rejects.toThrow('Transaction is not pending');
        });
    });

    describe('rejectPayment', () => {
        it('should reject payment with reason', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            const transaction = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await service.rejectPayment(transaction.id, 'Invalid payment proof');

            const updatedTx = await prisma.transaction.findUnique({
                where: { id: transaction.id },
            });

            expect(updatedTx?.status).toBe(PaymentStatus.FAILURE);

        });

        it('should throw error if transaction not pending', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            const transaction = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            await expect(
                service.rejectPayment(transaction.id, 'Test reason')
            ).rejects.toThrow('Transaction is not pending');
        });
    });

    describe('getSubscriptionStats', () => {
        it('should return correct statistics', async () => {
            const now = new Date();
            const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Active subscription
            const outlet1 = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'active-1' }),
                    subscriptionExpiresAt: futureDate,
                },
            });

            // Expired subscription
            const outlet2 = await prisma.outlet.create({
                data: {
                    ...createOutletData({ slug: 'expired-1' }),
                    subscriptionExpiresAt: pastDate,
                },
            });

            // Free outlet
            const outlet3 = await prisma.outlet.create({
                data: createOutletData({ slug: 'free-1' }),
            });

            // Pending payment
            await prisma.transaction.create({
                data: {
                    outletId: outlet1.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 50000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            // Settled payment
            await prisma.transaction.create({
                data: {
                    outletId: outlet1.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            const stats = await service.getSubscriptionStats();

            expect(stats.totalOutlets).toBe(3);
            expect(stats.activeSubscriptions).toBe(1);
            expect(stats.expiredSubscriptions).toBe(1);
            expect(stats.pendingPayments).toBe(1);
            expect(stats.totalRevenue).toBe(100000);
        });
    });
});
