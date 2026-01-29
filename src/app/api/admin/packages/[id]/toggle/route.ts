/**
 * PATCH /api/admin/packages/[id]/toggle
 * 
 * Toggle package active status (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { PackageManagementService } from '@/services/admin/PackageManagementService';

export const PATCH = withAdminAuth(async (req, session, context: { params: { id: string } }) => {
    try {
        const service = new PackageManagementService();
        const params = await context.params;
        const pkg = await service.togglePackageStatus(params.id);

        return NextResponse.json(pkg);
    } catch (error: any) {
        console.error('Error toggling package status:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to toggle package status' },
            { status: 500 }
        );
    }
});
