/**
 * GET /api/dashboard/packages
 * 
 * Get all active packages for selection (OWNER)
 */

import { NextResponse } from 'next/server';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { PackageManagementService } from '@/services/admin/PackageManagementService';

export const GET = withOwnerAuth(async () => {
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
});
