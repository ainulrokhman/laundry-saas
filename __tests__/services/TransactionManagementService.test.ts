/**
 * Transaction Management Service Tests (OWNER)
 * 
 * Tests for owner-side transaction viewing, filtering, and export
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { TransactionManagementService } from '@/services/dashboard/TransactionManagementService';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData } from '../utils/factories';
import { PaymentStatus, TransType } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('TransactionManagementService', () => {
    const prisma = createTestPrismaClient();
    const service = new TransactionManagementService();

    beforeEach(async () => {
        await cleanupTestDatabase(prisma);
    });

    afterAll(async () => {
        await cleanupTestDatabase(prisma);
        await prisma.$disconnect();
    });

    describe('getTransactions', () => {
        it('should return paginated transactions', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            // Create 15 transactions
            for (let i = 0; i < 15; i++) {
                await prisma.transaction.create({
                    data: {
                        outletId: outlet.id,
                        type: TransType.SUBSCRIPTION,
                        amount: 100000,
                        status: PaymentStatus.PENDING,
                        paymentMethod: 'TRANSFER',
                    },
                });
            }

            const result = await service.getTransactions(outlet.id, {
                page: 1,
                limit: 10,
            });

            expect(result.data).toHaveLength(10);
            expect(result.pagination.total).toBe(15);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.totalPages).toBe(2);
        });

        it('should filter by transaction type', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.LAUNDRY_ORDER,
                    amount: 50000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'CASH',
                },
            });

            const result = await service.getTransactions(outlet.id, {
                type: TransType.SUBSCRIPTION,
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].type).toBe(TransType.SUBSCRIPTION);
        });

        it('should filter by payment status', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 150000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            const result = await service.getTransactions(outlet.id, {
                status: PaymentStatus.PENDING,
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].status).toBe(PaymentStatus.PENDING);
        });

        it('should filter by date range', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                    createdAt: new Date('2024-01-15'),
                },
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 150000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                    createdAt: new Date('2024-02-15'),
                },
            });

            const result = await service.getTransactions(outlet.id, {
                dateFrom: new Date('2024-02-01'),
                dateTo: new Date('2024-02-28'),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].amount).toBe(150000);
        });

        it('should only return transactions for specified outlet', async () => {
            const outlet1 = await prisma.outlet.create({
                data: createOutletData({ slug: 'outlet-1' }),
            });

            const outlet2 = await prisma.outlet.create({
                data: createOutletData({ slug: 'outlet-2' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet1.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet2.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 150000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            const result = await service.getTransactions(outlet1.id, {});

            expect(result.data).toHaveLength(1);
            expect(result.data[0].outletId).toBe(outlet1.id);
        });
    });

    describe('getTransactionDetail', () => {
        it('should return transaction detail', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            const tx = await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                    proofUrl: 'https://example.com/proof.jpg',
                },
            });

            const detail = await service.getTransactionDetail(outlet.id, tx.id);

            expect(detail).toBeDefined();
            expect(detail.id).toBe(tx.id);
            expect(detail.amount).toBe(100000);
            expect(detail.proofUrl).toBe('https://example.com/proof.jpg');
        });

        it('should throw error if transaction not found', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await expect(
                service.getTransactionDetail(outlet.id, 'non-existent-id')
            ).rejects.toThrow('Transaction not found');
        });

        it('should not return transactions from other outlets', async () => {
            const outlet1 = await prisma.outlet.create({
                data: createOutletData({ slug: 'outlet-1' }),
            });

            const outlet2 = await prisma.outlet.create({
                data: createOutletData({ slug: 'outlet-2' }),
            });

            const tx = await prisma.transaction.create({
                data: {
                    outletId: outlet2.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            await expect(
                service.getTransactionDetail(outlet1.id, tx.id)
            ).rejects.toThrow('Transaction not found');
        });
    });

    describe('getTransactionStats', () => {
        it('should calculate stats correctly', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            // Subscription revenue
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            // Laundry order revenue
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.LAUNDRY_ORDER,
                    amount: 50000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'CASH',
                },
            });

            // Pending transaction (should not count in revenue)
            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 75000,
                    status: PaymentStatus.PENDING,
                    paymentMethod: 'TRANSFER',
                },
            });

            const stats = await service.getTransactionStats(outlet.id, {});

            expect(stats.totalRevenue).toBe(150000); // Only settled
            expect(stats.subscriptionRevenue).toBe(100000);
            expect(stats.laundryRevenue).toBe(50000);
            expect(stats.completedCount).toBeGreaterThanOrEqual(2);
            expect(stats.pendingCount).toBe(1);
        });

        it('should filter stats by date range', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                    createdAt: new Date('2024-01-15'),
                },
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 150000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                    createdAt: new Date('2024-02-15'),
                },
            });

            const stats = await service.getTransactionStats(outlet.id, {
                dateFrom: new Date('2024-02-01'),
                dateTo: new Date('2024-02-28'),
            });

            expect(stats.totalRevenue).toBe(150000);
            expect(stats.completedCount).toBe(1);
        });
    });

    describe('exportToCSV', () => {
        it('should generate CSV with correct headers', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            const csv = await service.exportToCSV(outlet.id, {});

            expect(csv).toContain('Date');
            expect(csv).toContain('Type');
            expect(csv).toContain('Amount');
            expect(csv).toContain('Status');
        });

        it('should include transaction data in CSV', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-outlet' }),
            });

            await prisma.transaction.create({
                data: {
                    outletId: outlet.id,
                    type: TransType.SUBSCRIPTION,
                    amount: 100000,
                    status: PaymentStatus.SETTLEMENT,
                    paymentMethod: 'TRANSFER',
                },
            });

            const csv = await service.exportToCSV(outlet.id, {});

            expect(csv).toContain('SUBSCRIPTION');
            expect(csv).toContain('100000');
            expect(csv).toContain('SETTLEMENT');
        });
    });
});
