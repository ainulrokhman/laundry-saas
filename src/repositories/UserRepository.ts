/**
 * User Repository
 *
 * Data access layer untuk User model.
 * Catatan multi-tenancy:
 * - Untuk route dashboard (OWNER/STAFF), wajib filter outletId di layer API/service.
 * - Untuk route admin (SUPERADMIN), boleh cross-outlet.
 */

import { prisma } from '@/lib/prisma';
import { Prisma, Role, User } from '@/generated/prisma';

export interface UserListFilters {
  role?: Role;
  outletId?: string | null;
  ownerId?: string; // NEW: filter staff by outlet's ownerId
  isActive?: boolean;
  search?: string;
}

export interface UserListPagination {
  page?: number;
  limit?: number;
}

export class UserRepository {
  private buildWhere(filters: UserListFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.outletId !== undefined) {
      // outletId bisa null untuk SUPERADMIN
      where.outletId = filters.outletId;
    }

    if (filters.ownerId) {
      where.outlet = { ownerId: filters.ownerId };
    }

    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findAll(
    filters: UserListFilters,
    pagination: UserListPagination = {}
  ): Promise<{ data: (User & { outlet: any | null })[]; total: number; page: number; limit: number }> {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination.limit && pagination.limit > 0 ? Math.min(pagination.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(filters);

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          outlet: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    return { data: users, total, page, limit };
  }

  async findById(id: string): Promise<(User & { outlet: any | null }) | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        outlet: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  async create(data: {
    phone: string;
    name: string;
    role: Role;
    outletId: string | null;
    pinHash: string;
    isActive?: boolean;
    isPinSet?: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        role: data.role,
        outletId: data.outletId,
        pin: data.pinHash,
        isActive: data.isActive ?? true,
        isPinSet: data.isPinSet ?? true,
        pinChangedAt: new Date(),
      },
    });
  }

  async update(
    id: string,
    data: {
      phone?: string;
      name?: string;
      role?: Role;
      outletId?: string | null;
      isActive?: boolean;
    }
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.outletId !== undefined ? { outletId: data.outletId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async resetPin(id: string, pinHash: string, options?: { markPinSet?: boolean }): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        pin: pinHash,
        pinChangedAt: new Date(),
        isPinSet: options?.markPinSet ?? true,
        // Reset lockout state agar tidak terkunci setelah reset
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async countActiveSuperAdmins(excludeUserId?: string): Promise<number> {
    return prisma.user.count({
      where: {
        role: Role.SUPERADMIN,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
  }

  async findOutletById(id: string) {
    return prisma.outlet.findUnique({
      where: { id },
    });
  }
}

