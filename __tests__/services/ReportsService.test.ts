/**
 * Reports Service Tests
 */

import { ReportsService } from '@/services/ReportsService';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createOrderData, createUserData } from '../utils/factories';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { OrderStatus, PaymentStatus } from '@/generated/prisma';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('ReportsService', () => {
    const prisma = createTestPrismaClient();
    const service = new ReportsService();

    beforeEach(async () => {
        await cleanupTestDatabase(prisma);
    });

    afterAll(async () => {
        await cleanupTestDatabase(prisma);
        await prisma.$disconnect();
    });

    describe('getReports', () => {
        it('should calculate correct summary stats', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-report-outlet' }),
            });

            const owner = await prisma.user.create({
                data: {
                    ...createUserData({ role: 'OWNER' }),
                    outletId: outlet.id,
                },
            });

            const sessionUser = {
                userId: owner.id,
                id: owner.id,
                phone: owner.phone,
                name: owner.name,
                role: owner.role,
                outletId: outlet.id,
            };

            const today = new Date();
            const todayStart = startOfDay(today);
            const todayEnd = endOfDay(today);

            try {
                // Order 1: Today, SETTLED, 50000
                await prisma.order.create({
                    data: {
                        ...createOrderData({
                            outletId: outlet.id,
                            totalAmount: 50000,
                            paymentStatus: PaymentStatus.SETTLEMENT,
                            status: OrderStatus.TAKEN,
                            customerPhone: '628111',
                        }),
                        createdAt: todayStart,
                    },
                });

                // Order 2: Today, SETTLED, 100000, same customer
                await prisma.order.create({
                    data: {
                        ...createOrderData({
                            outletId: outlet.id,
                            totalAmount: 100000,
                            paymentStatus: PaymentStatus.SETTLEMENT,
                            status: OrderStatus.TAKEN,
                            customerPhone: '628111',
                        }),
                        createdAt: todayStart,
                    },
                });

                // Order 3: Today, PENDING payment, 25000, diff customer
                await prisma.order.create({
                    data: {
                        ...createOrderData({
                            outletId: outlet.id,
                            totalAmount: 25000,
                            paymentStatus: PaymentStatus.PENDING,
                            status: OrderStatus.WASHING,
                            customerPhone: '628222',
                        }),
                        createdAt: todayStart,
                    },
                });

                // Order 4: Yesterday
                const yesterday = subDays(today, 1);
                await prisma.order.create({
                    data: {
                        ...createOrderData({
                            outletId: outlet.id,
                            totalAmount: 10000,
                            paymentStatus: PaymentStatus.SETTLEMENT,
                            status: OrderStatus.TAKEN,
                            customerPhone: '628333',
                        }),
                        createdAt: yesterday,
                    },
                });

                // Test 1: Today only
                const reportToday = await service.getReports(sessionUser, todayStart, todayEnd);

                expect(reportToday.summary.totalOrders).toBe(3);
                expect(reportToday.summary.totalRevenue).toBe(150000);
                expect(reportToday.summary.totalCustomers).toBe(2);
                expect(reportToday.summary.averageOrderValue).toBe(50000);
                expect(reportToday.dailyStats).toHaveLength(1);
                expect(reportToday.dailyStats[0].revenue).toBe(150000);

                // Test 2: Last 2 days
                const reportRange = await service.getReports(sessionUser, startOfDay(yesterday), todayEnd);

                expect(reportRange.summary.totalOrders).toBe(4);
                expect(reportRange.summary.totalRevenue).toBe(160000);
                expect(reportRange.summary.totalCustomers).toBe(3);
            } catch (error: any) {
                console.error('DEBUG ERROR:', error.message, JSON.stringify(error, null, 2));
                throw error;
            }
        });

        describe('Role Verification', () => {
            it('should allow OWNER to access reports', async () => {
                const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'role-test-owner' }) });
                const owner = await prisma.user.create({ data: { ...createUserData({ role: 'OWNER' }), outletId: outlet.id } });

                const sessionUser = {
                    userId: owner.id,
                    id: owner.id,
                    phone: owner.phone,
                    name: owner.name,
                    role: owner.role,
                    outletId: outlet.id,
                };

                await expect(service.getReports(sessionUser, new Date(), new Date())).resolves.not.toThrow();
            });

            it('should allow SUPERADMIN to access reports', async () => {
                const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'role-test-super' }) });
                // Superadmin might not have outlet in user record but pass it via session manipulation in real app
                // For service test, we simulate session user having the target outletId
                const admin = await prisma.user.create({ data: { ...createUserData({ role: 'SUPERADMIN' }), outletId: outlet.id } });

                const sessionUser = {
                    userId: admin.id,
                    id: admin.id,
                    phone: admin.phone,
                    name: admin.name,
                    role: admin.role,
                    outletId: outlet.id,
                };

                await expect(service.getReports(sessionUser, new Date(), new Date())).resolves.not.toThrow();
            });

            it('should deny STAFF from accessing reports', async () => {
                const outlet = await prisma.outlet.create({ data: createOutletData({ slug: 'role-test-staff' }) });
                const staff = await prisma.user.create({ data: { ...createUserData({ role: 'STAFF' }), outletId: outlet.id } });

                const sessionUser = {
                    userId: staff.id,
                    id: staff.id,
                    phone: staff.phone,
                    name: staff.name,
                    role: staff.role,
                    outletId: outlet.id,
                };

                await expect(service.getReports(sessionUser, new Date(), new Date())).rejects.toThrow();
            });
        });
    });
});

