/**
 * Transaction Detail API (OWNER Dashboard)
 * 
 * GET /api/dashboard/transactions/[id]
 * Returns detailed information for a specific transaction
 */

import { NextResponse } from 'next/server';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { TransactionManagementService } from '@/services/dashboard/TransactionManagementService';

const transactionService = new TransactionManagementService();

export const GET = withOwnerAuth(
    async (request: Request, session, context: { params: { id: string } }) => {
        try {
            const { id } = context.params;

            if (!id) {
                return NextResponse.json(
                    { error: 'Transaction ID is required' },
                    { status: 400 }
                );
            }

            if (!session.outletId) {
                return NextResponse.json(
                    { error: 'Outlet context required' },
                    { status: 403 }
                );
            }

            // Get transaction detail
            const transaction = await transactionService.getTransactionDetail(
                session.outletId,
                id
            );

            return NextResponse.json({
                success: true,
                data: transaction,
            });
        } catch (error: any) {
            console.error('Error fetching transaction detail:', error);

            if (error.message === 'Transaction not found') {
                return NextResponse.json(
                    { error: 'Transaction not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to fetch transaction detail' },
                { status: 500 }
            );
        }
    }
);
