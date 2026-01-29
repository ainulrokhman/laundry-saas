/**
 * Subscription Payment History API (OWNER)
 * 
 * GET /api/dashboard/subscription/history
 * Returns subscription payment history for the owner's outlet
 */

import { NextResponse } from 'next/server';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionPaymentService } from '@/services/dashboard/SubscriptionPaymentService';

const subscriptionService = new SubscriptionPaymentService();

export const GET = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
    try {
        if (!session.outletId) {
            return NextResponse.json(
                { error: 'Outlet context required' },
                { status: 403 }
            );
        }

        const history = await subscriptionService.getPaymentHistory(session.outletId);

        return NextResponse.json({
            success: true,
            data: history,
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payment history' },
            { status: 500 }
        );
    }
});
