/**
 * Admin Subscription Update API (SUPERADMIN)
 * 
 * PUT /api/admin/subscriptions/[userId]
 * Update owner's subscription package and expiry
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionManagementService } from '@/services/admin/SubscriptionManagementService';
import { z } from 'zod';

const subscriptionService = new SubscriptionManagementService();

const updateSchema = z.object({
    packageId: z.string().min(1, 'Package ID is required'),
    expiresAt: z.string().nullable(), // ISO Date string or null
});

// Using Request type to match withAdminAuth signature, but it receives NextRequest at runtime
export const PUT = withAdminAuth(async (request: Request, session: ExtendedSession, { params }: { params: { userId: string } }) => {
    try {
        const body = await request.json();
        const { packageId, expiresAt } = updateSchema.parse(body);

        const expiryDate = expiresAt ? new Date(expiresAt) : null;

        await subscriptionService.updateSubscription(params.userId, packageId, expiryDate);

        return NextResponse.json({
            success: true,
            message: 'Subscription updated successfully',
        });
    } catch (error: any) {
        console.error('Error updating subscription:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid data', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update subscription' },
            { status: 500 }
        );
    }
});
