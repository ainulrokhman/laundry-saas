/**
 * Subscription Status API (OWNER)
 * 
 * GET /api/dashboard/subscription/status
 * Returns current subscription status for the owner's outlet
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

        const subscription = await subscriptionService.getCurrentSubscription(session.outletId);

        return NextResponse.json({
            success: true,
            data: subscription,
        });
    } catch (error: any) {
        console.error('Error fetching subscription status:', error);

        if (error.message === 'Outlet not found') {
            return NextResponse.json(
                { error: 'Outlet not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch subscription status' },
            { status: 500 }
        );
    }
});
