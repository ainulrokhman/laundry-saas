/**
 * Admin Subscriptions List API (SUPERADMIN)
 * 
 * GET /api/admin/subscriptions
 * Returns all outlet subscriptions with status
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';

const subscriptionService = new SubscriptionManagementService();

export const GET = withAdminAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const subscriptions = await subscriptionService.getAllSubscriptions();

        return NextResponse.json({
            success: true,
            data: subscriptions,
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscriptions' },
            { status: 500 }
        );
    }
});
