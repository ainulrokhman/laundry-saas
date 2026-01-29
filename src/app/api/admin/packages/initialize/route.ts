/**
 * POST /api/admin/packages/initialize
 * 
 * Initialize default packages (seed) (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { PackageManagementService } from '@/services/admin/PackageManagementService';

export const POST = withAdminAuth(async () => {
    try {
        const service = new PackageManagementService();
        const packages = await service.initializeDefaultPackages();

        return NextResponse.json({
            message: 'Default packages initialized successfully',
            packages,
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error initializing packages:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to initialize packages' },
            { status: 500 }
        );
    }
});
