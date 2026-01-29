/**
 * Transaction List API (OWNER Dashboard)
 * 
 * GET /api/dashboard/transactions
 * Lists transactions for the owner's active outlet with filtering options
 * Supports Global Mode for OWNER without active outlet
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { TransactionManagementService } from '@/services/dashboard/TransactionManagementService';
import { PaymentStatus, TransType, Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
    type: z.string().nullable(),
    status: z.string().nullable(),
    dateFrom: z.string().nullable(),
    dateTo: z.string().nullable(),
    page: z.string().nullable(),
    limit: z.string().nullable(),
});

const transactionService = new TransactionManagementService();

export const GET = withAuth(
    async (request: Request, session: ExtendedSession) => {
        try {
            // Only OWNER can access transactions
            if (session.role !== Role.OWNER) {
                return NextResponse.json(
                    { error: 'Hanya OWNER yang dapat mengakses transaksi' },
                    { status: 403 }
                );
            }

            const { searchParams } = new URL(request.url);

            // Validate query params
            const params = querySchema.safeParse({
                type: searchParams.get('type'),
                status: searchParams.get('status'),
                dateFrom: searchParams.get('dateFrom'),
                dateTo: searchParams.get('dateTo'),
                page: searchParams.get('page'),
                limit: searchParams.get('limit'),
            });

            if (!params.success) {
                return NextResponse.json(
                    { error: 'Invalid query parameters', details: params.error.format() },
                    { status: 400 }
                );
            }

            const { type, status, dateFrom, dateTo, page, limit } = params.data;

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
            if (page) filters.page = parseInt(page);
            if (limit) filters.limit = parseInt(limit);

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
                        data: [],
                        pagination: { page: 1, limit: filters.limit || 50, total: 0, totalPages: 0 },
                        isGlobalMode: true,
                    });
                }

                const result = await transactionService.getGlobalTransactions(outletIds, filters);

                // Map with outlet info (already included by repository)
                const transactions = result.data.map((t: any) => ({
                    ...t,
                    outletId: t.outlet?.id,
                    outletName: t.outlet?.name,
                }));

                return NextResponse.json({
                    success: true,
                    data: transactions,
                    pagination: result.pagination,
                    isGlobalMode: true,
                });
            }

            // Single Outlet Mode
            const result = await transactionService.getTransactions(
                session.outletId,
                filters
            );

            return NextResponse.json({
                success: true,
                data: result.data,
                pagination: result.pagination,
                isGlobalMode: false,
            });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return NextResponse.json(
                { error: 'Failed to fetch transactions' },
                { status: 500 }
            );
        }
    },
    { roles: [Role.OWNER], requireOutlet: false }
);
