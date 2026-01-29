/**
 * GET /api/dashboard/subscription/current-package
 * 
 * Get current package details for the outlet (OWNER)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { PackageFeatureService } from '@/services/PackageFeatureService';

export const GET = withAuth(async (req, session) => {
    try {
        if (!session.outletId) {
            return NextResponse.json(
                { error: 'Outlet context required' },
                { status: 403 }
            );
        }

        const service = new PackageFeatureService();
        const packageInfo = await service.getOutletPackage(session.outletId);

        return NextResponse.json(packageInfo);
    } catch (error: any) {
        console.error('Error fetching current package:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch package information' },
            { status: 500 }
        );
    }
}, { roles: [Role.OWNER], requireOutlet: false });
