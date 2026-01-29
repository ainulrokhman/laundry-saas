/**
 * Package Feature Service
 * 
 * Service for checking feature access based on outlet's  subscription package.
 */

import { prisma } from '@/lib/prisma';
import { PackageFeature } from '@/constants/packageFeatures';

export class PackageFeatureService {
    /**
     * Check if outlet has access to a specific feature
     */
    async hasFeature(outletId: string, feature: PackageFeature): Promise<boolean> {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: {
                package: {
                    select: {
                        features: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!outlet) {
            return false;
        }

        // If no package assigned, deny access (except basic features)
        if (!outlet.package || !outlet.package.isActive) {
            // Allow basic features for FREE tier
            const freeFeatures = [
                PackageFeature.BASIC_POS,
                PackageFeature.ORDER_MANAGEMENT,
                PackageFeature.CUSTOMER_DATABASE,
                PackageFeature.BASIC_REPORTS,
                PackageFeature.INVOICE_GENERATION,
            ];
            return freeFeatures.includes(feature);
        }

        // Check subscription expiry
        if (outlet.subscriptionExpiresAt && outlet.subscriptionExpiresAt < new Date()) {
            // Expired subscription - downgrade to free features only
            const freeFeatures = [
                PackageFeature.BASIC_POS,
                PackageFeature.ORDER_MANAGEMENT,
                PackageFeature.CUSTOMER_DATABASE,
                PackageFeature.BASIC_REPORTS,
                PackageFeature.INVOICE_GENERATION,
            ];
            return freeFeatures.includes(feature);
        }

        // Check if feature is in package
        const packageFeatures = outlet.package.features as string[];
        return packageFeatures.includes(feature);
    }

    /**
     * Get all features available to an outlet
     */
    async getOutletFeatures(outletId: string): Promise<PackageFeature[]> {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: {
                package: {
                    select: {
                        features: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!outlet || !outlet.package || !outlet.package.isActive) {
            // Return free features
            return [
                PackageFeature.BASIC_POS,
                PackageFeature.ORDER_MANAGEMENT,
                PackageFeature.CUSTOMER_DATABASE,
                PackageFeature.BASIC_REPORTS,
                PackageFeature.INVOICE_GENERATION,
            ];
        }

        // Check subscription expiry
        if (outlet.subscriptionExpiresAt && outlet.subscriptionExpiresAt < new Date()) {
            return [
                PackageFeature.BASIC_POS,
                PackageFeature.ORDER_MANAGEMENT,
                PackageFeature.CUSTOMER_DATABASE,
                PackageFeature.BASIC_REPORTS,
                PackageFeature.INVOICE_GENERATION,
            ];
        }

        return outlet.package.features as PackageFeature[];
    }

    /**
     * Get outlet's current package info
     */
    async getOutletPackage(outletId: string) {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: {
                package: true,
            },
        });

        if (!outlet) {
            throw new Error('Outlet not found');
        }

        const isExpired = outlet.subscriptionExpiresAt
            ? outlet.subscriptionExpiresAt < new Date()
            : false;

        return {
            package: outlet.package,
            isExpired,
            expiresAt: outlet.subscriptionExpiresAt,
            features: await this.getOutletFeatures(outletId),
        };
    }

    /**
     * Check if outlet can add more staff
     */
    async canAddStaff(outletId: string): Promise<boolean> {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: {
                package: true,
                users: {
                    where: {
                        role: 'STAFF',
                        isActive: true,
                    },
                },
            },
        });

        if (!outlet) {
            return false;
        }

        // If no package, allow up to 3 staff (free tier)
        const maxStaff = outlet.package?.maxStaff ?? 3;

        // -1 means unlimited
        if (maxStaff === -1) {
            return true;
        }

        const currentStaffCount = outlet.users.length;
        return currentStaffCount < maxStaff;
    }

    /**
     * Get staff limit for outlet
     */
    async getStaffLimit(outletId: string): Promise<{ current: number; max: number; canAdd: boolean }> {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: {
                package: true,
                users: {
                    where: {
                        role: 'STAFF',
                        isActive: true,
                    },
                },
            },
        });

        if (!outlet) {
            throw new Error('Outlet not found');
        }

        const maxStaff = outlet.package?.maxStaff ?? 3;
        const currentStaffCount = outlet.users.length;

        return {
            current: currentStaffCount,
            max: maxStaff,
            canAdd: maxStaff === -1 || currentStaffCount < maxStaff,
        };
    }
}
