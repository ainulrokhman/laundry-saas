/**
 * Upload Signature API for Payment Proofs (OWNER)
 * 
 * POST /api/dashboard/subscription/upload-signature
 * Generates Cloudinary upload signature for payment proof uploads
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { FileUploadService } from '@/services/upload/FileUploadService';
import { Role } from '@/generated/prisma';

const fileUploadService = new FileUploadService();

export const POST = withAuth(async (request: Request, session: ExtendedSession) => {
    try {
        // For Global Owner actions (like Subscription), outletId might be null.
        // We allow this and put files in a general folder.
        const folderContext = session.outletId || `global-owner/${session.userId}`;

        // Generate upload signature for payment proof
        const signature = fileUploadService.generateUploadSignature(
            folderContext,
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
}, { roles: [Role.OWNER], requireOutlet: false });
