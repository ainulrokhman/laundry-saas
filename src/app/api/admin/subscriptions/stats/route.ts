/**
 * Subscription Statistics API (SUPERADMIN)
 * 
 * GET /api/admin/subscriptions/stats
 * Returns subscription statistics for dashboard
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';

const subscriptionService = new SubscriptionManagementService();

export const GET = withAdminAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const stats = await subscriptionService.getSubscriptionStats();

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching subscription stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription statistics' },
            { status: 500 }
        );
    }
});
