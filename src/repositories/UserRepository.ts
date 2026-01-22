/**
 * User Repository
 * Handles all database operations for User entity
 * Following Single Responsibility Principle
 */

import { prisma } from "@/lib/prisma";
import { Role } from "@/types/enums/Role";
import type { User } from "@prisma/client";

export interface IUserRepository {
  /**
   * Find user by email
   * Used for authentication
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by ID with outlet context
   * @param id - User ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  findById(id: string, outletId?: string): Promise<User | null>;

  /**
   * Find all users in an outlet
   * @param outletId - Outlet ID (required for non-SUPERADMIN)
   */
  findByOutletId(outletId: string): Promise<User[]>;

  /**
   * Create new user
   */
  create(data: {
    email: string;
    name: string;
    password: string;
    role: Role;
    outletId: string;
  }): Promise<User>;
}

export class UserRepository implements IUserRepository {
  /**
   * Find user by email
   * Used for authentication - no outlet filter needed
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: {
        outlet: true,
      },
    });
  }

  /**
   * Find user by ID with outlet context
   * @param id - User ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  async findById(id: string, outletId?: string): Promise<User | null> {
    const where: { id: string; outletId?: string } = { id };

    // Apply outlet filter if provided (tenant isolation)
    if (outletId) {
      where.outletId = outletId;
    }

    return prisma.user.findFirst({
      where,
      include: {
        outlet: true,
      },
    });
  }

  /**
   * Find all users in an outlet
   * @param outletId - Outlet ID (required for tenant isolation)
   */
  async findByOutletId(outletId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { outletId },
      include: {
        outlet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Create new user
   */
  async create(data: {
    email: string;
    name: string;
    password: string;
    role: Role;
    outletId: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
      include: {
        outlet: true,
      },
    });
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
