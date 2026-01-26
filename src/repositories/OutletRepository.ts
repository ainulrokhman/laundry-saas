/**
 * Outlet Repository
 * 
 * Data access layer for Outlet model.
 * Handles all database operations related to outlets.
 */

import { prisma } from '@/lib/prisma';
import { Outlet, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

export class OutletRepository extends BaseRepository {
  /**
   * Find outlet by ID
   * Note: Outlets don't require outletId filtering (they are the tenant root)
   */
  async findById(id: string): Promise<Outlet | null> {
    return prisma.outlet.findUnique({
      where: { id },
      include: {
        users: true,
        bankAccounts: true,
        paymentGatewayConfigs: true,
      },
    });
  }

  /**
   * Find outlet by slug
   */
  async findBySlug(slug: string): Promise<Outlet | null> {
    return prisma.outlet.findUnique({
      where: { slug },
      include: {
        users: true,
        bankAccounts: {
          where: { isActive: true },
        },
        paymentGatewayConfigs: {
          where: { isActive: true },
        },
      },
    });
  }

  /**
   * Find outlet by slug for PUBLIC landing page.
   * Returns minimal fields only (no relations / no sensitive fields).
   */
  async findPublicBySlug(slug: string) {
    return prisma.outlet.findUnique({
      where: { slug },
      select: {
        id: true, // internal usage (e.g., fetch services); do not expose in DTO
        name: true,
        slug: true,
        address: true,
        description: true,
        contactPhone: true,
        businessHours: true,
        seoTitle: true,
        seoDescription: true,
        logoUrl: true,
        coverUrl: true,
      },
    });
  }

  /**
   * Find landing page settings by outlet ID (OWNER dashboard settings).
   * Minimal fields only (no relations).
   */
  async findLandingPageById(id: string) {
    return prisma.outlet.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        description: true,
        contactPhone: true,
        businessHours: true,
        seoTitle: true,
        seoDescription: true,
        logoUrl: true,
        coverUrl: true,
      },
    });
  }

  /**
   * Find all outlets (SuperAdmin only)
   */
  async findAll(): Promise<Outlet[]> {
    return prisma.outlet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Find outlets owned by a specific OWNER
   * Used for OWNER multi-outlet outlet switcher.
   */
  async findByOwnerId(ownerId: string): Promise<Outlet[]> {
    return prisma.outlet.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find a specific outlet owned by OWNER (authorization helper)
   */
  async findOwnedOutletById(ownerId: string, outletId: string): Promise<Outlet | null> {
    return prisma.outlet.findFirst({
      where: { id: outletId, ownerId },
    });
  }

  /**
   * Create new outlet
   */
  async create(data: Prisma.OutletCreateInput): Promise<Outlet> {
    return prisma.outlet.create({
      data,
    });
  }

  /**
   * Update outlet
   */
  async update(
    id: string,
    data: Prisma.OutletUpdateInput
  ): Promise<Outlet> {
    return prisma.outlet.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete outlet
   */
  async delete(id: string): Promise<Outlet> {
    return prisma.outlet.delete({
      where: { id },
    });
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const outlet = await prisma.outlet.findFirst({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!outlet;
  }
}
