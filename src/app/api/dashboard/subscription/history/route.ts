/**
 * Subscription Payment History API (OWNER)
 * 
 * GET /api/dashboard/subscription/history
 * Returns subscription payment history for the owner's outlet
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { SubscriptionPaymentService } from '@/services/dashboard/SubscriptionPaymentService';

const subscriptionService = new SubscriptionPaymentService();

export const GET = withAuth(async (request: Request, session: ExtendedSession) => {
    try {
        // Global owner mode allowed, no outlet check needed
        // if (!session.outletId) ... removed

        const history = await subscriptionService.getPaymentHistory(session.userId);

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
}, { roles: [Role.OWNER], requireOutlet: false });
