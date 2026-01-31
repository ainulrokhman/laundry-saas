/**
 * POST /api/admin/packages
 * 
 * Create new subscription package (SUPERADMIN only)
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { PackageManagementService } from '@/services/admin/PackageManagementService';
import { z } from 'zod';
import { PackageFeature } from '@/constants/packageFeatures';

const createPackageSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    price: z.number().min(0, 'Price must be positive'),
    description: z.string().optional(),
    features: z.array(z.nativeEnum(PackageFeature)),
    maxStaff: z.number().int(),
    maxOutlets: z.number().int(),
    sortOrder: z.number().int().optional(),
    isDefault: z.boolean().optional(),
});

export const POST = withAdminAuth(async (req) => {
    try {
        const body = await req.json();
        const validatedData = createPackageSchema.parse(body);

        const service = new PackageManagementService();
        const pkg = await service.createPackage(validatedData);

        return NextResponse.json(pkg, { status: 201 });
    } catch (error: any) {
        console.error('Error creating package:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create package' },
            { status: 500 }
        );
    }
});

export const GET = withAdminAuth(async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const service = new PackageManagementService();
        const packages = await service.getAllPackages(includeInactive);

        return NextResponse.json(packages);
    } catch (error: any) {
        console.error('Error fetching packages:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch packages' },
            { status: 500 }
        );
    }
});
