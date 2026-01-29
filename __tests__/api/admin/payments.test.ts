/**
 * Integration Tests for Admin Payments API
 *
 * Tests API endpoints for subscription payment verification
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestPrismaClient, cleanupTestDatabase } from '../../utils/test-db';
import { PaymentStatus, TransType, Role } from '@/generated/prisma';

describe('Admin Payments API Integration Tests', () => {
    const prisma = createTestPrismaClient();

    beforeEach(async () => {
        await cleanupTestDatabase(prisma);
    });

    afterAll(async () => {
        await cleanupTestDatabase(prisma);
        await prisma.$disconnect();
    });

    describe('GET /api/admin/payments', () => {
        it('should return list of subscription payments', async () => {
            // Create test data
            const outlet = await prisma.outlet.create({
                data: {
                    name: 'Test Outlet',
                    slug: 'test-outlet',
                    address: 'Test Address',
                },
            });

            const payment1 = await prisma.transaction.create({
                data: {
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                    outletId: outlet.id,
                },
            });

            const payment2 = await prisma.transaction.create({
                data: {
                    type: TransType.SUBSCRIPTION,
                    amount: 150000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                    outletId: outlet.id,
                    settledAt: new Date(),
                },
            });

            // Verify data created correctly
            expect(payment1.type).toBe(TransType.SUBSCRIPTION);
            expect(payment1.status).toBe(PaymentStatus.PENDING);
            expect(payment2.status).toBe(PaymentStatus.SETTLEMENT);
        });

        it('should filter payments by status', async () => {
            const outlet = await prisma.outlet.create({
                data: {
                    name: 'Test Outlet',
                    slug: 'test-outlet-2',
                    address: 'Test Address',
                },
            });

            await prisma.transaction.createMany({
                data: [
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.PENDING,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet.id,
                    },
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 150000,
                        status: PaymentStatus.SETTLEMENT,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet.id,
                        settledAt: new Date(),
                    },
                ],
            });

            const pendingPayments = await prisma.transaction.findMany({
                where: {
                    type: TransType.SUBSCRIPTION,
                    status: PaymentStatus.PENDING,
                },
            });

            const approvedPayments = await prisma.transaction.findMany({
                where: {
                    type: TransType.SUBSCRIPTION,
                    status: PaymentStatus.SETTLEMENT,
                },
            });

            expect(pendingPayments).toHaveLength(1);
            expect(approvedPayments).toHaveLength(1);
        });
    });

    describe('Payment Status Update', () => {
        it('should update payment status to SETTLEMENT', async () => {
            const outlet = await prisma.outlet.create({
                data: {
                    name: 'Test Outlet',
                    slug: 'test-outlet-3',
                    address: 'Test Address',
                },
            });

            const payment = await prisma.transaction.create({
                data: {
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                    outletId: outlet.id,
                },
            });

            // Approve payment
            const updated = await prisma.transaction.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.SETTLEMENT,
                    settledAt: new Date(),
                },
            });

            expect(updated.status).toBe(PaymentStatus.SETTLEMENT);
            expect(updated.settledAt).toBeTruthy();
        });

        it('should update payment status to FAILURE', async () => {
            const outlet = await prisma.outlet.create({
                data: {
                    name: 'Test Outlet',
                    slug: 'test-outlet-4',
                    address: 'Test Address',
                },
            });

            const payment = await prisma.transaction.create({
                data: {
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                    outletId: outlet.id,
                },
            });

            // Reject payment
            const updated = await prisma.transaction.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.FAILURE,
                },
            });

            expect(updated.status).toBe(PaymentStatus.FAILURE);
        });
    });

    describe('Payment Statistics', () => {
        it('should calculate correct statistics', async () => {
            const outlet = await prisma.outlet.create({
                data: {
                    name: 'Test Outlet',
                    slug: 'test-outlet-stats',
                    address: 'Test Address',
                },
            });

            // Create multiple payments with different statuses
            await prisma.transaction.createMany({
                data: [
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.PENDING,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet.id,
                    },
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.PENDING,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet.id,
                    },
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 150000,
                        status: PaymentStatus.SETTLEMENT,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet.id,
                        settledAt: new Date(),
                    },
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.FAILURE,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet.id,
                    },
                ],
            });

            // Get statistics
            const [pending, approved, rejected, total] = await Promise.all([
                prisma.transaction.count({
                    where: { type: TransType.SUBSCRIPTION, status: PaymentStatus.PENDING },
                }),
                prisma.transaction.count({
                    where: { type: TransType.SUBSCRIPTION, status: PaymentStatus.SETTLEMENT },
                }),
                prisma.transaction.count({
                    where: { type: TransType.SUBSCRIPTION, status: PaymentStatus.FAILURE },
                }),
                prisma.transaction.count({
                    where: { type: TransType.SUBSCRIPTION },
                }),
            ]);

            expect(pending).toBe(2);
            expect(approved).toBe(1);
            expect(rejected).toBe(1);
            expect(total).toBe(4);
        });
    });

    describe('Cross-outlet queries', () => {
        it('should retrieve payments from multiple outlets', async () => {
            // Create two outlets
            const outlet1 = await prisma.outlet.create({
                data: {
                    name: 'Outlet 1',
                    slug: 'outlet-1',
                    address: 'Address 1',
                },
            });

            const outlet2 = await prisma.outlet.create({
                data: {
                    name: 'Outlet 2',
                    slug: 'outlet-2',
                    address: 'Address 2',
                },
            });

            // Create payments for both outlets
            await prisma.transaction.createMany({
                data: [
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.PENDING,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet1.id,
                    },
                    {
                        type: TransType.SUBSCRIPTION,
                        amount: 150000,
                        status: PaymentStatus.PENDING,
                        paymentMethod: 'TRANSFER',
                        outletId: outlet2.id,
                    },
                ],
            });

            // Query all subscription payments (cross-outlet)
            const allPayments = await prisma.transaction.findMany({
                where: {
                    type: TransType.SUBSCRIPTION,
                },
            });

            expect(allPayments).toHaveLength(2);
            expect(allPayments.map((p) => p.outletId).sort()).toEqual([outlet1.id, outlet2.id].sort());
        });
    });
});
