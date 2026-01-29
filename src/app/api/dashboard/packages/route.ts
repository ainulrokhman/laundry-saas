/**
 * GET /api/dashboard/packages
 * 
 * Get all active packages for selection (OWNER)
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { PackageManagementService } from '@/services/admin/PackageManagementService';

export const GET = withAuth(async () => {
    try {
        const service = new PackageManagementService();
        const packages = await service.getAllPackages(false); // Only active packages

        return NextResponse.json(packages);
    } catch (error: any) {
        console.error('Error fetching packages:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch packages' },
            { status: 500 }
        );
    }
}, { roles: [Role.OWNER], requireOutlet: false });
