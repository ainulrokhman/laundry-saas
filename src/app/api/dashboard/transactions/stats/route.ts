/**
 * Transaction Statistics API (OWNER Dashboard)
 * 
 * GET /api/dashboard/transactions/stats
 * Returns transaction statistics for the owner's outlet
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { TransactionManagementService } from '@/services/dashboard/TransactionManagementService';

const querySchema = z.object({
    dateFrom: z.string().nullable(),
    dateTo: z.string().nullable(),
});

const transactionService = new TransactionManagementService();

export const GET = withOwnerAuth(async (request: Request, session) => {
    try {
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
        const filters: any = {};
        if (dateFrom) filters.dateFrom = new Date(dateFrom);
        if (dateTo) filters.dateTo = new Date(dateTo);

        if (!session.outletId) {
            return NextResponse.json(
                { error: 'Outlet context required' },
                { status: 403 }
            );
        }

        // Get statistics
        const stats = await transactionService.getTransactionStats(
            session.outletId,
            filters
        );

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction statistics' },
            { status: 500 }
        );
    }
});
