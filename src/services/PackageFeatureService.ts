/**
 * Package Feature Service
 * 
 * Service for checking feature access based on owner's subscription package.
 * Now supports Owner-based subscription model (One subscription for all outlets).
 */

import { prisma } from '@/lib/prisma';
import { PackageFeature, PACKAGE_DEFINITIONS } from '@/constants/packageFeatures';
import { Role } from '@/generated/prisma';

export class PackageFeatureService {
    /**
     * Get the owner of an outlet
     */
    private async getOutletOwner(outletId: string) {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: {
                owner: {
                    include: {
                        package: true,
                    },
                },
            },
        });

        if (!outlet || !outlet.owner) {
            return null;
        }

        return outlet.owner;
    }

    /**
     * Get effective features for an owner (or outlet's owner)
     * Handles expiry and fallback to free tier.
     */
    private getEffectiveFeatures(owner: any): PackageFeature[] {
        // Default Free Features (KUCEK)
        const freeFeatures = PACKAGE_DEFINITIONS['KUCEK'].features;

        if (!owner.packageId || !owner.package) {
            return freeFeatures;
        }

        // Check expiry
        if (owner.subscriptionExpiresAt && owner.subscriptionExpiresAt < new Date()) {
            return freeFeatures;
        }

        return owner.package.features as PackageFeature[];
    }

    /**
     * Check if outlet (via its owner) has access to a specific feature
     */
    async hasFeature(outletId: string, feature: PackageFeature): Promise<boolean> {
        const owner = await this.getOutletOwner(outletId);

        if (!owner) {
            // If no owner found (orphan outlet?), deny access to paid features
            // But allow basic features just in case
            const freeFeatures = PACKAGE_DEFINITIONS['KUCEK'].features;
            return freeFeatures.includes(feature);
        }

        const features = this.getEffectiveFeatures(owner);
        return features.includes(feature);
    }

    /**
     * Get all features available to an outlet
     */
    async getOutletFeatures(outletId: string): Promise<PackageFeature[]> {
        const owner = await this.getOutletOwner(outletId);

        if (!owner) {
            return PACKAGE_DEFINITIONS['KUCEK'].features;
        }

        return this.getEffectiveFeatures(owner);
    }

    /**
     * Get outlet's current package info (actually Owner's package)
     */
    async getOutletPackage(outletId: string) {
        const owner = await this.getOutletOwner(outletId);

        if (!owner) {
            throw new Error('Outlet owner not found');
        }

        const isExpired = owner.subscriptionExpiresAt
            ? owner.subscriptionExpiresAt < new Date()
            : false;

        return {
            package: owner.package || PACKAGE_DEFINITIONS['KUCEK'], // Fallback to virtual object if needed, but DB should have it
            isExpired,
            expiresAt: owner.subscriptionExpiresAt,
            features: this.getEffectiveFeatures(owner),
        };
    }

    /**
     * Check if owner can add more staff to a specific outlet
     * Note: Limit is usually per outlet or total staff per owner? 
     * Definition says: "Max Staff" in PackageDefinition.
     * Assuming the limit is PER OUTLET as per typical SaaS models, 
     * but could be interpreted as Total Staff across all outlets.
     * Current implementation checks PER OUTLET.
     */
    async canAddStaff(outletId: string): Promise<boolean> {
        const owner = await this.getOutletOwner(outletId);
        if (!owner) return false;

        // Get effective package capabilities
        // If expired, they drop to KUCEK (maxStaff: 1)
        let maxStaff = 1; // Default/Expired

        if (owner.package && (!owner.subscriptionExpiresAt || owner.subscriptionExpiresAt >= new Date())) {
            maxStaff = owner.package.maxStaff;
        }

        // Unlimited
        if (maxStaff === -1) return true;

        // Count current staff in this outlet
        const currentStaffCount = await prisma.user.count({
            where: {
                outletId: outletId,
                role: 'STAFF',
                isActive: true,
            },
        });

        return currentStaffCount < maxStaff;
    }

    /**
     * Check if owner can create more outlets
     */
    async canCreateOutlet(ownerId: string): Promise<boolean> {
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            include: { package: true },
        });

        if (!owner) return false;

        let maxOutlets = 1; // Default/Expired

        if (owner.package && (!owner.subscriptionExpiresAt || owner.subscriptionExpiresAt >= new Date())) {
            maxOutlets = owner.package.maxOutlets;
        }

        if (maxOutlets === -1) return true;

        const currentOutletCount = await prisma.outlet.count({
            where: { ownerId: ownerId },
        });

        // If they have 1 outlet, and max is 1, they cannot create more.
        // So count must be LESS than max.
        return currentOutletCount < maxOutlets;
    }

    /**
     * Check if can add more customers
     * (Feature: CUSTOMER_LIMIT_100 vs UNLIMITED)
     */
    async canAddCustomer(outletId: string): Promise<boolean> {
        const features = await this.getOutletFeatures(outletId);

        // If they have UNLIMITED, return true immediately
        if (features.includes(PackageFeature.CUSTOMER_UNLIMITED)) {
            return true;
        }

        // If they have LIMIT_100
        if (features.includes(PackageFeature.CUSTOMER_LIMIT_100)) {
            const count = await prisma.customer.count({
                where: { outletId },
            });
            return count < 100;
        }

        // Default to restricted if no feature found (shouldn't happen)
        return false;
    }

    /**
     * Get staff limit details
     */
    async getStaffLimit(outletId: string): Promise<{ current: number; max: number; canAdd: boolean }> {
        const owner = await this.getOutletOwner(outletId);
        if (!owner) throw new Error('Owner not found');

        let maxStaff = 1;
        if (owner.package && (!owner.subscriptionExpiresAt || owner.subscriptionExpiresAt >= new Date())) {
            maxStaff = owner.package.maxStaff;
        }

        const currentStaffCount = await prisma.user.count({
            where: {
                outletId: outletId,
                role: 'STAFF',
                isActive: true,
            },
        });

        return {
            current: currentStaffCount,
            max: maxStaff,
            canAdd: maxStaff === -1 || currentStaffCount < maxStaff,
        };
    }
}
