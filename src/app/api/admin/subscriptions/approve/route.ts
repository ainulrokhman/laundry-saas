/**
 * Approve Payment API (SUPERADMIN)
 * 
 * POST /api/admin/subscriptions/approve
 * Approves payment and extends outlet subscription
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';

const requestSchema = z.object({
    transactionId: z.string().uuid(),
    durationDays: z.number().int().positive(),
});

const subscriptionService = new SubscriptionManagementService();

export const POST = withAdminAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const body: unknown = await request.json();
        const data = requestSchema.parse(body);

        await subscriptionService.approvePayment(
            data.transactionId,
            data.durationDays
        );

        return NextResponse.json({
            success: true,
            message: 'Payment approved and subscription extended',
        });
    } catch (error: any) {
        console.error('Error approving payment:', error);

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
            { error: 'Failed to approve payment' },
            { status: 500 }
        );
    }
});
