/**
 * Pending Payments API (SUPERADMIN)
 * 
 * GET /api/admin/subscriptions/pending
 * Returns all pending subscription payments
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';

const subscriptionService = new SubscriptionManagementService();

export const GET = withAdminAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const payments = await subscriptionService.getPendingPayments();

        return NextResponse.json({
            success: true,
            data: payments,
        });
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pending payments' },
            { status: 500 }
        );
    }
});
