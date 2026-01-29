/**
 * Upload Signature API for Payment Proofs (OWNER)
 * 
 * POST /api/dashboard/subscription/upload-signature
 * Generates Cloudinary upload signature for payment proof uploads
 */

import { NextResponse } from 'next/server';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { FileUploadService } from '@/services/upload/FileUploadService';

const fileUploadService = new FileUploadService();

export const POST = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
    try {
        if (!session.outletId) {
            return NextResponse.json(
                { error: 'Outlet context required' },
                { status: 403 }
            );
        }

        // Generate upload signature for payment proof
        const signature = fileUploadService.generateUploadSignature(
            session.outletId,
            'payment-proof'
        );

        return NextResponse.json({
            success: true,
            data: signature,
        });
    } catch (error: any) {
        console.error('Error generating upload signature:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload signature', message: error.message },
            { status: 500 }
        );
    }
});
