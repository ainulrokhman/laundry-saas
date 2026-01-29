/**
 * Reject Payment API (SUPERADMIN)
 * 
 * POST /api/admin/subscriptions/reject
 * Rejects payment with reason
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';

const requestSchema = z.object({
    transactionId: z.string().uuid(),
    reason: z.string().min(1),
});

const subscriptionService = new SubscriptionManagementService();

export const POST = withAdminAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const body: unknown = await request.json();
        const data = requestSchema.parse(body);

        await subscriptionService.rejectPayment(
            data.transactionId,
            data.reason
        );

        return NextResponse.json({
            success: true,
            message: 'Payment rejected',
        });
    } catch (error: any) {
        console.error('Error rejecting payment:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.format() },
                { status: 400 }
            );
        }

        if (error.message === 'Transaction not found') {
            return NextResponse.json(
                { error: 'Transaction not found' },
                { status: 404 }
            );
        }

        if (error.message === 'Transaction is not pending') {
            return NextResponse.json(
                { error: 'Transaction is not pending' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to reject payment' },
            { status: 500 }
        );
    }
});
