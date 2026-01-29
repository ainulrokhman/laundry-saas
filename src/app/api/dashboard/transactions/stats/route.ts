/**
 * Transaction Statistics API (OWNER Dashboard)
 * 
 * GET /api/dashboard/transactions/stats
 * Returns transaction statistics for the owner's outlet
 * Supports Global Mode for OWNER without active outlet
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { TransactionManagementService } from '@/services/dashboard/TransactionManagementService';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
    dateFrom: z.string().nullable(),
    dateTo: z.string().nullable(),
});

const transactionService = new TransactionManagementService();

export const GET = withAuth(
    async (request: Request, session: ExtendedSession) => {
        try {
            // Only OWNER can access transaction stats
            if (session.role !== Role.OWNER) {
                return NextResponse.json(
                    { error: 'Hanya OWNER yang dapat mengakses statistik transaksi' },
                    { status: 403 }
                );
            }

            const { searchParams } = new URL(request.url);

            // Validate query params
            const params = querySchema.safeParse({
                dateFrom: searchParams.get('dateFrom'),
                dateTo: searchParams.get('dateTo'),
            });

            if (!params.success) {
                return NextResponse.json(
                    { error: 'Invalid query parameters', details: params.error.format() },
                    { status: 400 }
                );
            }

            const { dateFrom, dateTo } = params.data;

            // Build filters
            const filters: { dateFrom?: Date; dateTo?: Date } = {};
            if (dateFrom) filters.dateFrom = new Date(dateFrom);
            if (dateTo) filters.dateTo = new Date(dateTo);

            // Global Mode: OWNER without active outlet
            const isGlobalMode = !session.outletId;

            if (isGlobalMode) {
                // Fetch owned outlets
                const ownedOutlets = await prisma.outlet.findMany({
                    where: { ownerId: session.userId },
                    select: { id: true },
                });
                const outletIds = ownedOutlets.map(o => o.id);

                if (outletIds.length === 0) {
                    return NextResponse.json({
                        success: true,
                        data: {
                            totalRevenue: 0,
                            subscriptionRevenue: 0,
                            laundryRevenue: 0,
                            pendingCount: 0,
                            completedCount: 0,
                        },
                        isGlobalMode: true,
                    });
                }

                const stats = await transactionService.getGlobalTransactionStats(outletIds, filters);

                return NextResponse.json({
                    success: true,
                    data: stats,
                    isGlobalMode: true,
                });
            }

            // Single Outlet Mode
            const stats = await transactionService.getTransactionStats(
                session.outletId,
                filters
            );

            return NextResponse.json({
                success: true,
                data: stats,
                isGlobalMode: false,
            });
        } catch (error) {
            console.error('Error fetching transaction stats:', error);
            return NextResponse.json(
                { error: 'Failed to fetch transaction statistics' },
                { status: 500 }
            );
        }
    },
    { roles: [Role.OWNER], requireOutlet: false }
);
