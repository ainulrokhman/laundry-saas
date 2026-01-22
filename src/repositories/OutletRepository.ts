/**
 * Outlet Repository
 * Handles all database operations for Outlet entity
 * Following Single Responsibility Principle
 */

import { prisma } from "@/lib/prisma";
import type { Outlet } from "@prisma/client";

/**
 * Outlet with statistics (counts)
 */
export type OutletWithStats = Outlet & {
  _count: {
    users: number;
    orders: number;
    services: number;
  };
};

export interface IOutletRepository {
  /**
   * Find outlet by ID
   * @param id - Outlet ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  findById(id: string, outletId?: string): Promise<Outlet | null>;

  /**
   * Find outlet by slug
   * Used for public microsite access
   * @param slug - Outlet slug
   */
  findBySlug(slug: string): Promise<Outlet | null>;

  /**
   * Find all outlets
   * For SUPERADMIN: returns all outlets
   * For others: returns only their outlet (if outletId provided)
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  findAll(outletId?: string): Promise<Outlet[]>;

  /**
   * Create new outlet
   */
  create(data: {
    name: string;
    slug: string;
    address: string;
    bankInfo?: string;
    isPro?: boolean;
  }): Promise<Outlet>;

  /**
   * Update outlet
   * @param id - Outlet ID
   * @param data - Updated data
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      address?: string;
      bankInfo?: string;
      isPro?: boolean;
    },
    outletId?: string
  ): Promise<Outlet | null>;

  /**
   * Delete outlet
   * @param id - Outlet ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  delete(id: string, outletId?: string): Promise<boolean>;
}

export class OutletRepository implements IOutletRepository {
  /**
   * Find outlet by ID
   * @param id - Outlet ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   *                   If provided, verifies that id === outletId (tenant isolation)
   */
  async findById(id: string, outletId?: string): Promise<Outlet | null> {
    // For non-SUPERADMIN: verify that the outlet they're accessing is their own
    if (outletId && id !== outletId) {
      return null; // Tenant isolation: can't access other outlets
    }

    return prisma.outlet.findUnique({
      where: { id },
    });
  }

  /**
   * Find outlet by slug
   * Used for public microsite access
   * @param slug - Outlet slug
   */
  async findBySlug(slug: string): Promise<Outlet | null> {
    return prisma.outlet.findUnique({
      where: { slug },
    });
  }

  /**
   * Find all outlets
   * For SUPERADMIN: returns all outlets (outletId is undefined)
   * For others: returns only their outlet (outletId is provided)
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  async findAll(outletId?: string): Promise<OutletWithStats[]> {
    // For non-SUPERADMIN: filter by their outletId
    const where = outletId ? { id: outletId } : undefined;

    return prisma.outlet.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
            services: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Create new outlet
   */
  async create(data: {
    name: string;
    slug: string;
    address: string;
    bankInfo?: string;
    isPro?: boolean;
  }): Promise<Outlet> {
    return prisma.outlet.create({
      data: {
        name: data.name,
        slug: data.slug,
        address: data.address,
        bankInfo: data.bankInfo,
        isPro: data.isPro ?? false,
      },
    });
  }

  /**
   * Update outlet
   * @param id - Outlet ID
   * @param data - Updated data
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   *                   If provided, verifies that id === outletId (tenant isolation)
   */
  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      address?: string;
      bankInfo?: string;
      isPro?: boolean;
    },
    outletId?: string
  ): Promise<Outlet | null> {
    // For non-SUPERADMIN: verify that the outlet they're updating is their own
    if (outletId && id !== outletId) {
      return null; // Tenant isolation: can't update other outlets
    }

    return prisma.outlet.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.address && { address: data.address }),
        ...(data.bankInfo !== undefined && { bankInfo: data.bankInfo }),
        ...(data.isPro !== undefined && { isPro: data.isPro }),
      },
    });
  }

  /**
   * Delete outlet
   * @param id - Outlet ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   *                   If provided, verifies that id === outletId (tenant isolation)
   */
  async delete(id: string, outletId?: string): Promise<boolean> {
    // For non-SUPERADMIN: verify that the outlet they're deleting is their own
    if (outletId && id !== outletId) {
      return false; // Tenant isolation: can't delete other outlets
    }

    try {
      await prisma.outlet.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const outletRepository = new OutletRepository();
