/**
 * Transaction Export API (OWNER Dashboard)
 * 
 * GET /api/dashboard/transactions/export
 * Exports transactions to CSV format
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { TransactionManagementService } from '@/services/dashboard/TransactionManagementService';
import { PaymentStatus, TransType } from '@/generated/prisma';

const querySchema = z.object({
    type: z.string().nullable(),
    status: z.string().nullable(),
    dateFrom: z.string().nullable(),
    dateTo: z.string().nullable(),
});

const transactionService = new TransactionManagementService();

export const GET = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const { searchParams } = new URL(request.url);

        // Validate query params
        const params = querySchema.safeParse({
            type: searchParams.get('type'),
            status: searchParams.get('status'),
            dateFrom: searchParams.get('dateFrom'),
            dateTo: searchParams.get('dateTo'),
        });

        if (!params.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: params.error.format() },
                { status: 400 }
            );
        }

        const { type, status, dateFrom, dateTo } = params.data;

        // Validate enum values if provided
        if (type && !Object.values(TransType).includes(type as TransType)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${Object.values(TransType).join(', ')}` },
                { status: 400 }
            );
        }
        if (status && !Object.values(PaymentStatus).includes(status as PaymentStatus)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${Object.values(PaymentStatus).join(', ')}` },
                { status: 400 }
            );
        }

        // Build filters
        const filters: any = {};
        if (type) filters.type = type as TransType;
        if (status) filters.status = status as PaymentStatus;
        if (dateFrom) filters.dateFrom = new Date(dateFrom);
        if (dateTo) filters.dateTo = new Date(dateTo);

        if (!session.outletId) {
            return NextResponse.json(
                { error: 'Outlet context required' },
                { status: 403 }
            );
        }

        // Export to CSV
        const csv = await transactionService.exportToCSV(
            session.outletId,
            filters
        );

        // Return CSV file
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error) {
        console.error('Error exporting transactions:', error);
        return NextResponse.json(
            { error: 'Failed to export transactions' },
            { status: 500 }
        );
    }
});
