/**
 * Package Management Service (SUPERADMIN)
 * 
 * Handles CRUD operations for subscription packages.
 */

import { prisma } from '@/lib/prisma';
import { PACKAGE_DEFINITIONS, PackageFeature } from '@/constants/packageFeatures';

export interface PackageData {
    name: string;
    slug: string;
    price: number;
    description?: string;
    features: PackageFeature[];
    maxStaff: number;
    sortOrder?: number;
}

export class PackageManagementService {
    /**
     * Get all packages
     */
    async getAllPackages(includeInactive = false) {
        const packages = await prisma.subscriptionPackage.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        return packages.map((pkg) => ({
            ...pkg,
            features: pkg.features as PackageFeature[],
            subscriberCount: pkg._count.users,
        }));
    }

    /**
     * Get package by ID
     */
    async getPackageById(id: string) {
        const pkg = await prisma.subscriptionPackage.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        if (!pkg) {
            throw new Error('Package not found');
        }

        return {
            ...pkg,
            features: pkg.features as PackageFeature[],
            subscriberCount: pkg._count.users,
        };
    }

    /**
     * Get package by slug
     */
    async getPackageBySlug(slug: string) {
        const pkg = await prisma.subscriptionPackage.findUnique({
            where: { slug },
        });

        if (!pkg) {
            throw new Error('Package not found');
        }

        return {
            ...pkg,
            features: pkg.features as PackageFeature[],
        };
    }

    /**
     * Create new package
     */
    async createPackage(data: PackageData) {
        // Check if slug already exists
        const existing = await prisma.subscriptionPackage.findUnique({
            where: { slug: data.slug },
        });

        if (existing) {
            throw new Error('Package with this slug already exists');
        }

        const pkg = await prisma.subscriptionPackage.create({
            data: {
                name: data.name,
                slug: data.slug,
                price: data.price,
                description: data.description,
                features: data.features,
                maxStaff: data.maxStaff,
                sortOrder: data.sortOrder ?? 0,
            },
        });

        return {
            ...pkg,
            features: pkg.features as PackageFeature[],
        };
    }

    /**
     * Update package
     */
    async updatePackage(id: string, data: Partial<PackageData>) {
        const pkg = await prisma.subscriptionPackage.findUnique({
            where: { id },
        });

        if (!pkg) {
            throw new Error('Package not found');
        }

        // If slug is being updated, check for conflicts
        if (data.slug && data.slug !== pkg.slug) {
            const existing = await prisma.subscriptionPackage.findUnique({
                where: { slug: data.slug },
            });

            if (existing) {
                throw new Error('Package with this slug already exists');
            }
        }

        const updated = await prisma.subscriptionPackage.update({
            where: { id },
            data: {
                name: data.name,
                slug: data.slug,
                price: data.price,
                description: data.description,
                features: data.features,
                maxStaff: data.maxStaff,
                sortOrder: data.sortOrder,
            },
        });

        return {
            ...updated,
            features: updated.features as PackageFeature[],
        };
    }

    /**
     * Toggle package active status
     */
    async togglePackageStatus(id: string) {
        const pkg = await prisma.subscriptionPackage.findUnique({
            where: { id },
        });

        if (!pkg) {
            throw new Error('Package not found');
        }

        const updated = await prisma.subscriptionPackage.update({
            where: { id },
            data: { isActive: !pkg.isActive },
        });

        return {
            ...updated,
            features: updated.features as PackageFeature[],
        };
    }

    /**
     * Delete package (soft delete by deactivating)
     */
    async deletePackage(id: string) {
        const pkg = await prisma.subscriptionPackage.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        if (!pkg) {
            throw new Error('Package not found');
        }

        // Don't allow deletion if users are using it
        if (pkg._count.users > 0) {
            throw new Error(`Cannot delete package: ${pkg._count.users} user(s) are using it`);
        }

        await prisma.subscriptionPackage.delete({
            where: { id },
        });

        return true;
    }

    /**
     * Initialize default packages (seed)
     */
    async initializeDefaultPackages() {
        const packages = Object.values(PACKAGE_DEFINITIONS);
        const results = [];

        for (const pkg of packages) {
            // Upsert (Create or Update) logic
            const existing = await prisma.subscriptionPackage.findUnique({
                where: { slug: pkg.slug },
            });

            if (existing) {
                // Update existing
                const updated = await prisma.subscriptionPackage.update({
                    where: { id: existing.id },
                    data: {
                        name: pkg.name,
                        price: pkg.price,
                        description: pkg.description,
                        features: pkg.features,
                        maxStaff: pkg.maxStaff,
                        sortOrder: pkg.sortOrder,
                    },
                });
                results.push({ ...updated, status: 'updated' });
            } else {
                // Create new
                const created = await prisma.subscriptionPackage.create({
                    data: {
                        name: pkg.name,
                        slug: pkg.slug,
                        price: pkg.price,
                        description: pkg.description,
                        features: pkg.features,
                        maxStaff: pkg.maxStaff,
                        sortOrder: pkg.sortOrder,
                        isActive: true,
                    },
                });
                results.push({ ...created, status: 'created' });
            }
        }

        return results;
    }

    /**
     * Get package statistics
     */
    async getPackageStats() {
        const packages = await prisma.subscriptionPackage.findMany({
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        return packages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            slug: pkg.slug,
            price: pkg.price,
            subscriberCount: pkg._count.users,
            isActive: pkg.isActive,
        }));
    }
}
