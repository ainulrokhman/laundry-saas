import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export class CustomerRepository {
  async findAll({
    outletId,
    search,
    page = 1,
    limit = 10,
  }: {
    outletId: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const where: Prisma.CustomerWhereInput = {
      outletId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      total,
      customers,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(outletId: string, id: string) {
    return prisma.customer.findFirst({
      where: { id, outletId },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }

  async findByIdWithOrders(outletId: string, id: string, limit = 20) {
    return prisma.customer.findFirst({
      where: { id, outletId },
      include: {
        _count: {
          select: { orders: true },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            trackingCode: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
  }

  async findByPhone(outletId: string, phone: string) {
    return prisma.customer.findFirst({
      where: { outletId, phone },
    });
  }

  async create(data: {
    outletId: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    isMember?: boolean;
  }) {
    return prisma.customer.create({
      data,
    });
  }

  async update(
    outletId: string,
    id: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      isMember?: boolean;
    },
  ) {
    return prisma.customer.update({
      where: { id, outletId }, // Ensure outlet ownership via findFirst logic in service or try/catch if composite key helps
      // Wait, prisma update 'where' requires unique.
      // Since `id` is PK, it's unique globally. But for security we must check outletId.
      // So checking in Service layer is key, or we separate check.
      // Alternatively, updateMany relative to outletId:
      // return prisma.customer.updateMany({ where: { id, outletId }, data });
      // return type of updateMany is Count, not Record. So we stick to update but verify first.
      data,
    });
  }

  async delete(outletId: string, id: string) {
    // Check ownership first or use deleteMany
    return prisma.customer.deleteMany({
      where: { id, outletId },
    });
  }

  // Helper to ensure ownership before strict update (if updateMany is not enough)
  async verifyOwnership(outletId: string, id: string): Promise<boolean> {
    const count = await prisma.customer.count({ where: { id, outletId } });
    return count > 0;
  }

  // ============================================
  // Global Methods (Multi-Outlet)
  // ============================================

  /**
   * Find all customers for multiple outlets (Global Mode)
   */
  async findAllByOutletIds({
    outletIds,
    search,
    page = 1,
    limit = 10,
  }: {
    outletIds: string[];
    search?: string;
    page?: number;
    limit?: number;
  }) {
    if (outletIds.length === 0) {
      return { total: 0, customers: [], page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.CustomerWhereInput = {
      outletId: { in: outletIds },
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          outlet: {
            select: { id: true, name: true },
          },
        },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      total,
      customers,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
