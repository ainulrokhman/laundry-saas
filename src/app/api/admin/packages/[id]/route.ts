/**
 * GET/PUT /api/admin/packages/[id]
 * 
 * Get or update specific package (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { PackageManagementService } from '@/services/admin/PackageManagementService';
import { z } from 'zod';
import { PackageFeature } from '@/constants/packageFeatures';

const updatePackageSchema = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    price: z.number().min(0).optional(),
    description: z.string().optional(),
    features: z.array(z.nativeEnum(PackageFeature)).optional(),
    maxStaff: z.number().int().optional(),
    maxOutlets: z.number().int().optional(),
    sortOrder: z.number().int().optional(),
    isDefault: z.boolean().optional(),
});

export const GET = withAdminAuth(async (req, session, context: { params: { id: string } }) => {
    try {
        const service = new PackageManagementService();
        const params = await context.params;
        const pkg = await service.getPackageById(params.id);

        return NextResponse.json(pkg);
    } catch (error: any) {
        console.error('Error fetching package:', error);
        return NextResponse.json(
            { error: error.message || 'Package not found' },
            { status: 404 }
        );
    }
});

export const PUT = withAdminAuth(async (req, session, context: { params: { id: string } }) => {
    try {
        const body = await req.json();
        const validatedData = updatePackageSchema.parse(body);

        const service = new PackageManagementService();
        const params = await context.params;
        const pkg = await service.updatePackage(params.id, validatedData);

        return NextResponse.json(pkg);
    } catch (error: any) {
        console.error('Error updating package:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to update package' },
            { status: 500 }
        );
    }
});

export const DELETE = withAdminAuth(async (req, session, context: { params: { id: string } }) => {
    try {
        const service = new PackageManagementService();
        const params = await context.params;
        await service.deletePackage(params.id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting package:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete package' },
            { status: 500 }
        );
    }
});
