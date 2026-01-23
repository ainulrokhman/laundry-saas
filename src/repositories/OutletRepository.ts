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
