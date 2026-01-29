/**
 * Upload Payment Proof API (OWNER)
 * 
 * POST /api/dashboard/subscription/upload-proof
 * Uploads payment proof and creates pending subscription transaction
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { SubscriptionPaymentService } from '@/services/dashboard/SubscriptionPaymentService';

const requestSchema = z.object({
    amount: z.number().positive(),
    proofUrl: z.string().url(),
    bankAccountId: z.string().uuid(),
    description: z.string().optional(),
});

const subscriptionService = new SubscriptionPaymentService();

export const POST = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
    try {
        if (!session.outletId) {
            return NextResponse.json(
                { error: 'Outlet context required' },
                { status: 403 }
            );
        }

        const body: unknown = await request.json();
        const data = requestSchema.parse(body);

        // Upload payment proof and create transaction
        const transactionId = await subscriptionService.uploadPaymentProof(
            session.outletId,
            data
        );

        return NextResponse.json({
            success: true,
            data: {
                transactionId,
                message: 'Payment proof uploaded successfully. Awaiting admin verification.',
            },
        });
    } catch (error: any) {
        console.error('Error uploading payment proof:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.format() },
                { status: 400 }
            );
        }

        if (error.message === 'Bank account not found') {
            return NextResponse.json(
                { error: 'Bank account not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to upload payment proof' },
            { status: 500 }
        );
    }
});
